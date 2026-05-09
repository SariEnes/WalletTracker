import { fetchWalletData } from './lib/api/data-provider';
async function test() {
  const result = await fetchWalletData('0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045', true);
  console.log(JSON.stringify(result.data.tokens.filter(t => t.contractAddress === 'native'), null, 2));
}
test();
