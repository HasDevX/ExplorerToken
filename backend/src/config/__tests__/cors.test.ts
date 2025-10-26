import { CorsRequest, CorsOptions, CorsOptionsDelegate } from 'cors';

describe('corsOptionsDelegate', () => {
  const loadDelegate = async (allowlistCsv?: string): Promise<CorsOptionsDelegate<CorsRequest>> => {
    jest.resetModules();

    if (allowlistCsv === undefined) {
      delete process.env.FRONTEND_URL;
    } else {
      process.env.FRONTEND_URL = allowlistCsv;
    }

    const mod = await import('@/config/cors');
    return mod.corsOptionsDelegate;
  };

  const runDelegate = (delegate: CorsOptionsDelegate<CorsRequest>, origin?: string) => {
    const req = { headers: origin ? { origin } : {} } as CorsRequest;

    return new Promise<CorsOptions>((resolve, reject) => {
      delegate(req, (err: Error | null, options?: CorsOptions) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(options ?? {});
      });
    });
  };

  it('allows requests without an origin header', async () => {
    const delegate = await loadDelegate('https://example.test');
    const options = await runDelegate(delegate);

    expect(options).toMatchObject({ origin: true, credentials: true });
  });

  it('allows allow-listed origins', async () => {
    const delegate = await loadDelegate('https://allowed.test');
    const options = await runDelegate(delegate, 'https://allowed.test');

    expect(options).toMatchObject({ origin: 'https://allowed.test', credentials: true });
  });

  it('rejects non allow-listed origins when allowlist is set', async () => {
    const delegate = await loadDelegate('https://allowed.test');
    const options = await runDelegate(delegate, 'https://denied.test');

    expect(options).toMatchObject({ origin: false, credentials: true });
  });

  it('allows any origin when allowlist is empty', async () => {
    const delegate = await loadDelegate('');
    const options = await runDelegate(delegate, 'https://any.test');

    expect(options).toMatchObject({ origin: 'https://any.test', credentials: true });
  });
});
