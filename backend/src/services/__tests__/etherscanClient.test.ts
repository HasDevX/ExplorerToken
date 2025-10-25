// Set up environment variables before importing modules
process.env.ETHERSCAN_API_KEY = 'test-api-key';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-16-chars';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

import nock from 'nock';
import {
  getTokenTransfers,
  getTopTokenHolders,
  getTokenHolders,
  getTxDetails,
  getTokenInfo,
  EtherscanError,
  ProviderFeatureUnavailableError,
} from '../etherscanClient';
import { BASE_URL } from '@/config/etherscan';

describe('etherscanClient', () => {
  beforeEach(() => {
    // Clear all HTTP mocks before each test
    nock.cleanAll();
  });

  afterEach(() => {
    // Ensure all expected HTTP requests were made
    if (!nock.isDone()) {
      nock.cleanAll();
    }
  });

  describe('getTokenTransfers', () => {
    it('should fetch and normalize token transfers', async () => {
      const mockResponse = {
        status: '1',
        message: 'OK',
        result: [
          {
            blockNumber: '12345678',
            timeStamp: '1609459200',
            hash: '0xabc123',
            from: '0x123...',
            to: '0x456...',
            contractAddress: '0x789...',
            value: '1000000000000000000',
            tokenName: 'Test Token',
            tokenSymbol: 'TEST',
            tokenDecimal: '18',
          },
          {
            blockNumber: '12345679',
            timeStamp: '1609459300',
            hash: '0xdef456',
            from: '0xaaa...',
            to: '0xbbb...',
            contractAddress: '0x789...',
            value: '2000000000000000000',
            tokenName: 'Test Token',
            tokenSymbol: 'TEST',
            tokenDecimal: '18',
          },
        ],
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      const result = await getTokenTransfers({
        chainId: 1,
        address: '0x123...',
        page: 1,
        offset: 10,
        sort: 'desc',
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        hash: '0xabc123',
        blockNumber: 12345678,
        timeStamp: 1609459200,
        from: '0x123...',
        to: '0x456...',
        contractAddress: '0x789...',
        valueRaw: '1000000000000000000',
        tokenSymbol: 'TEST',
        tokenName: 'Test Token',
        tokenDecimal: 18,
      });
    });

    it('should handle transfers without optional fields', async () => {
      const mockResponse = {
        status: '1',
        message: 'OK',
        result: [
          {
            blockNumber: '12345678',
            timeStamp: '1609459200',
            hash: '0xabc123',
            from: '0x123...',
            to: '0x456...',
            contractAddress: '0x789...',
            value: '1000000000000000000',
          },
        ],
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      const result = await getTokenTransfers({
        chainId: 1,
        contractAddress: '0x789...',
      });

      expect(result).toHaveLength(1);
      expect(result[0].tokenSymbol).toBeUndefined();
      expect(result[0].tokenName).toBeUndefined();
      expect(result[0].tokenDecimal).toBeUndefined();
    });
  });

  describe('getTopTokenHolders', () => {
    it('should fetch and normalize top token holders', async () => {
      const mockResponse = {
        status: '1',
        message: 'OK',
        result: [
          {
            TokenHolderAddress: '0xaaa...',
            TokenHolderQuantity: '500000000000000000000',
            Share: '50.5',
          },
          {
            TokenHolderAddress: '0xbbb...',
            TokenHolderQuantity: '300000000000000000000',
            Share: '30.3',
          },
        ],
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      const result = await getTopTokenHolders({
        chainId: 1,
        contractAddress: '0x789...',
        limit: 100,
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        address: '0xaaa...',
        balanceRaw: '500000000000000000000',
        percent: 50.5,
      });
      expect(result[1]).toEqual({
        address: '0xbbb...',
        balanceRaw: '300000000000000000000',
        percent: 30.3,
      });
    });

    it('should handle holders without share percentage', async () => {
      const mockResponse = {
        status: '1',
        message: 'OK',
        result: [
          {
            TokenHolderAddress: '0xaaa...',
            TokenHolderQuantity: '500000000000000000000',
          },
        ],
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      const result = await getTopTokenHolders({
        chainId: 1,
        contractAddress: '0x789...',
      });

      expect(result).toHaveLength(1);
      expect(result[0].percent).toBeUndefined();
    });
  });

  describe('getTxDetails', () => {
    it('should aggregate transaction, receipt, and status data', async () => {
      const mockTxResponse = {
        status: '1',
        message: 'OK',
        result: {
          hash: '0xtxhash',
          blockNumber: '0xbc614e',
          from: '0x123...',
          to: '0x456...',
          value: '0xde0b6b3a7640000',
          input: '0x',
        },
      };

      const mockReceiptResponse = {
        status: '1',
        message: 'OK',
        result: {
          gasUsed: '0x5208',
          effectiveGasPrice: '0x3b9aca00',
          logs: [
            {
              address: '0x789...',
              topics: ['0xtopic1', '0xtopic2'],
              data: '0xdata',
            },
          ],
        },
      };

      const mockStatusResponse = {
        status: '1',
        message: 'OK',
        result: {
          isError: '0',
        },
      };

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'eth_getTransactionByHash')
        .reply(200, mockTxResponse);

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'eth_getTransactionReceipt')
        .reply(200, mockReceiptResponse);

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'getstatus')
        .reply(200, mockStatusResponse);

      const result = await getTxDetails({
        chainId: 1,
        txHash: '0xtxhash',
      });

      expect(result).toEqual({
        hash: '0xtxhash',
        blockNumber: 12345678,
        from: '0x123...',
        to: '0x456...',
        valueWei: '0xde0b6b3a7640000',
        input: '0x',
        status: 'success',
        receipt: {
          gasUsed: '0x5208',
          effectiveGasPrice: '0x3b9aca00',
          logs: [
            {
              address: '0x789...',
              topics: ['0xtopic1', '0xtopic2'],
              data: '0xdata',
            },
          ],
        },
      });
    });

    it('should handle pending transactions', async () => {
      const mockTxResponse = {
        status: '1',
        message: 'OK',
        result: {
          hash: '0xtxhash',
          blockNumber: null,
          from: '0x123...',
          to: '0x456...',
          value: '0xde0b6b3a7640000',
          input: '0x',
        },
      };

      const mockReceiptResponse = {
        status: '1',
        message: 'OK',
        result: null,
      };

      const mockStatusResponse = {
        status: '1',
        message: 'OK',
        result: {
          isError: '0',
        },
      };

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'eth_getTransactionByHash')
        .reply(200, mockTxResponse);

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'eth_getTransactionReceipt')
        .reply(200, mockReceiptResponse);

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'getstatus')
        .reply(200, mockStatusResponse);

      const result = await getTxDetails({
        chainId: 1,
        txHash: '0xtxhash',
      });

      expect(result.blockNumber).toBeNull();
      expect(result.status).toBe('pending');
      expect(result.receipt).toBeUndefined();
    });

    it('should handle failed transactions', async () => {
      const mockTxResponse = {
        status: '1',
        message: 'OK',
        result: {
          hash: '0xtxhash',
          blockNumber: '0xbc614e',
          from: '0x123...',
          to: '0x456...',
          value: '0xde0b6b3a7640000',
          input: '0x',
        },
      };

      const mockReceiptResponse = {
        status: '1',
        message: 'OK',
        result: {
          gasUsed: '0x5208',
        },
      };

      const mockStatusResponse = {
        status: '1',
        message: 'OK',
        result: {
          isError: '1',
          errDescription: 'Out of gas',
        },
      };

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'eth_getTransactionByHash')
        .reply(200, mockTxResponse);

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'eth_getTransactionReceipt')
        .reply(200, mockReceiptResponse);

      nock(BASE_URL)
        .get('')
        .query((query) => query.action === 'getstatus')
        .reply(200, mockStatusResponse);

      const result = await getTxDetails({
        chainId: 1,
        txHash: '0xtxhash',
      });

      expect(result.status).toBe('fail');
    });
  });

  describe('getTokenInfo', () => {
    it('should fetch token supply', async () => {
      const mockResponse = {
        status: '1',
        message: 'OK',
        result: '1000000000000000000000000',
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      const result = await getTokenInfo({
        chainId: 1,
        contractAddress: '0x789...',
      });

      expect(result).toEqual({
        contractAddress: '0x789...',
        totalSupplyRaw: '1000000000000000000000000',
        name: undefined,
        symbol: undefined,
        decimals: undefined,
      });
    });

    it('should handle missing token supply', async () => {
      const mockResponse = {
        status: '0',
        message: 'NOTOK',
        result: 'Error! Missing or invalid',
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      const result = await getTokenInfo({
        chainId: 1,
        contractAddress: '0x789...',
      });

      expect(result).toEqual({
        contractAddress: '0x789...',
        totalSupplyRaw: undefined,
        name: undefined,
        symbol: undefined,
        decimals: undefined,
      });
    });
  });

  describe('Error handling', () => {
    it('should throw EtherscanError on upstream status 0', async () => {
      const mockResponse = {
        status: '0',
        message: 'Invalid API Key',
        result: [],
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      await expect(
        getTokenTransfers({
          chainId: 1,
          address: '0x123...',
        })
      ).rejects.toThrow(EtherscanError);
    });

    it('should include error message from upstream', async () => {
      const mockResponse = {
        status: '0',
        message: 'Invalid API Key',
        result: [],
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      try {
        await getTokenTransfers({
          chainId: 1,
          address: '0x123...',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EtherscanError);
        expect((error as Error).message).toContain('Invalid API Key');
      }
    });

    it('should throw EtherscanError on network error', async () => {
      nock(BASE_URL).get('').query(true).replyWithError('Network error');

      try {
        await getTokenTransfers({
          chainId: 1,
          address: '0x123...',
        });
        fail('Should have thrown an error');
      } catch (error) {
        expect(error).toBeInstanceOf(EtherscanError);
        expect((error as Error).message).toContain('Network error');
      }
    });

    it('should throw EtherscanError on invalid response format', async () => {
      nock(BASE_URL).get('').query(true).reply(200, { invalid: 'response' });

      await expect(
        getTokenTransfers({
          chainId: 1,
          address: '0x123...',
        })
      ).rejects.toThrow(EtherscanError);
    });
  });

  describe('ProviderFeatureUnavailableError handling', () => {
    it('should throw ProviderFeatureUnavailableError on 402 status code', async () => {
      nock(BASE_URL).get('').query(true).reply(402, {
        status: '0',
        message: 'Payment Required',
        result: [],
      });

      await expect(
        getTokenHolders({
          chainId: 1,
          contractAddress: '0x789...',
        })
      ).rejects.toThrow(ProviderFeatureUnavailableError);
    });

    it('should throw ProviderFeatureUnavailableError on 403 status code', async () => {
      nock(BASE_URL).get('').query(true).reply(403, {
        status: '0',
        message: 'Forbidden',
        result: [],
      });

      await expect(
        getTokenHolders({
          chainId: 1,
          contractAddress: '0x789...',
        })
      ).rejects.toThrow('Feature not available');
    });

    it('should throw ProviderFeatureUnavailableError on NOTOK with plan message', async () => {
      nock(BASE_URL).get('').query(true).reply(200, {
        status: '0',
        message: 'NOTOK',
        result: 'This feature is not available for your plan',
      });

      await expect(
        getTokenHolders({
          chainId: 1,
          contractAddress: '0x789...',
        })
      ).rejects.toThrow('Feature not available');
    });
  });

  describe('getTopTokenHolders resolver pattern', () => {
    it('should try tokenholderlist first and succeed', async () => {
      const mockResponse = {
        status: '1',
        message: 'OK',
        result: [
          {
            TokenHolderAddress: '0xaaa...',
            TokenHolderQuantity: '500000000000000000000',
            Share: '50.5',
          },
        ],
      };

      nock(BASE_URL).get('').query(true).reply(200, mockResponse);

      const result = await getTopTokenHolders({
        chainId: 1,
        contractAddress: '0x789...',
        limit: 100,
      });

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        address: '0xaaa...',
        balanceRaw: '500000000000000000000',
        percent: 50.5,
      });
    });

    it('should fallback to topholders on 404 from tokenholderlist', async () => {
      const mockSuccessResponse = {
        status: '1',
        message: 'OK',
        result: [
          {
            TokenHolderAddress: '0xbbb...',
            TokenHolderQuantity: '300000000000000000000',
          },
        ],
      };

      // First request (tokenholderlist) fails with 404
      nock(BASE_URL)
        .get('')
        .query((q) => q.action === 'tokenholderlist')
        .reply(404, {
          status: '0',
          message: 'Not Found',
          result: [],
        });

      // Second request (topholders) succeeds
      nock(BASE_URL)
        .get('')
        .query((q) => q.action === 'topholders')
        .reply(200, mockSuccessResponse);

      const result = await getTopTokenHolders({
        chainId: 1,
        contractAddress: '0x789...',
        limit: 50,
      });

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0xbbb...');
    });

    it('should fallback to topholders on Invalid action error', async () => {
      const mockSuccessResponse = {
        status: '1',
        message: 'OK',
        result: [
          {
            TokenHolderAddress: '0xccc...',
            TokenHolderQuantity: '200000000000000000000',
          },
        ],
      };

      // First request fails with Invalid action
      nock(BASE_URL)
        .get('')
        .query((q) => q.action === 'tokenholderlist')
        .reply(200, {
          status: '0',
          message: 'Invalid action',
          result: [],
        });

      // Second request succeeds
      nock(BASE_URL)
        .get('')
        .query((q) => q.action === 'topholders')
        .reply(200, mockSuccessResponse);

      const result = await getTopTokenHolders({
        chainId: 1,
        contractAddress: '0x789...',
      });

      expect(result).toHaveLength(1);
      expect(result[0].address).toBe('0xccc...');
    });

    it('should not fallback on ProviderFeatureUnavailableError', async () => {
      // First request fails with feature unavailable
      nock(BASE_URL).get('').query(true).reply(200, {
        status: '0',
        message: 'NOTOK',
        result: 'This feature is not available for your plan',
      });

      await expect(
        getTopTokenHolders({
          chainId: 1,
          contractAddress: '0x789...',
        })
      ).rejects.toThrow('Feature not available');

      // Should only make one request (no fallback)
      expect(nock.isDone()).toBe(true);
    });
  });
});
