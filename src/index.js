const fs = require('fs')
const path = require('path')

const del = require('del')
const axios = require('axios')

const parseContracts = require('./tasks/parseContracts')
const parseTokens = require('./tasks/parseTokens')
const parseSushiswapWrappedNativeTokens = require('./tasks/parseSushiswapWrappedNativeTokens')
const processContracts = require('./tasks/processContracts')

async function build() {
  await del(getBuildLocation('*'))

  const data = {
    dexIdToDexMetadata: {
      sushiswap: {
        id: 'sushiswap',
        name: 'SushiSwap',
        url: 'https://sushi.com',
        contractTypeToContractName: {
          pair: 'UniswapV2Pair',
          factory: 'UniswapV2Factory',
          router: 'UniswapV2Router02',
        },
        __metadata__: {
          tokensGitUrl: 'git@github.com:sushiswap/default-token-list.git',
          tokensLocation: 'tokens',
          sdkGitUrl: 'git@github.com:sushiswap/sushiswap-sdk.git',
          contractsGitUrl: 'git@github.com:sushiswap/sushiswap.git',
        },
      },
      fatex: {
        id: 'fatex',
        name: 'FATEx',
        url: 'https://fatex.io',
        contractTypeToContractName: {
          pair: 'UniswapV2Pair',
          factory: 'UniswapV2Factory',
          router: 'UniswapV2Router02',
        },
        __metadata__: {
          tokensGitUrl: 'git@github.com:FATEx-DAO/default-token-list.git',
          tokensLocation: 'src/tokens',
          contractsGitUrl: 'git@github.com:FATEx-DAO/fatex-dex-protocol.git',
        },
      },
      quickswap: {
        id: 'quickswap',
        name: 'QuickSwap',
        url: 'https://quickswap.exchange',
        contractTypeToContractName: {
          pair: 'UniswapV2Pair',
          factory: 'UniswapV2Factory',
          router: 'UniswapV2Router02',
        },
        __metadata__: {
          chainIdToFactoryAddress: {
            1: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
            3: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
            4: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
            5: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
            42: '0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f',
          },
          chainIdToRouterAddress: {
            1: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            3: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            4: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            5: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
            42: '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D',
          },
        },
      },
    },
    abiNameToAbi: {
      ERC20: require(path.resolve(__dirname, './inputs/ERC20.abi.json')),
      UniswapV2Pair: require(path.resolve(__dirname, './inputs/UniswapV2Pair.abi.json')),
      UniswapV2Factory: require(path.resolve(__dirname, './inputs/UniswapV2Factory.abi.json')),
      UniswapV2Router02: require(path.resolve(__dirname, './inputs/UniswapV2Router02.abi.json')),
    },
    stablecoinSymbols: ['USDT', 'DAI', 'USDC', 'cUSD', 'BUSD'], // TODO complete it
    chainIdToStablecoinAddressToStableCoinMetadata: {},
    dexIdToChainIdToStablecoinAddressToStablecoinMetadata: {},
    // chainNameToChainId: {},
    chainIdToTokenAddressToTokenMetadata: {},
    dexIdToChainIdTokenAddressToTokenMetadata: {},
    dexIdToChainIdToContractNameToContractInfo: {},
    chainIdToDexIds: {},
    chainIdToChainMetadata: {},
    chainIdToWrappedNativeTokenAddress: {},
  }

  /* ---
    https://chainid.network/chains.json
  --- */

  console.log('Parsing https://chainid.network/chains.json')

  const chainInfos = (await axios.get('https://chainid.network/chains.json')).data

  /* ---
    sushiswap
  --- */

  await parseContracts(data, 'sushiswap')
  await parseTokens(data, 'sushiswap')
  await parseSushiswapWrappedNativeTokens(data)

  /* ---
    fatex
  --- */

  await parseContracts(data, 'fatex')
  await parseTokens(data, 'fatex')

  /* ---
    quickswap
  --- */

  await processContracts(data, 'quickswap')

  /* ---
    Post-processing
  --- */

  chainInfos.forEach(chainInfo => {
    data.chainIdToChainMetadata[chainInfo.chainId] = chainInfo
    data.chainIdToChainMetadata[chainInfo.chainId].dexes = data.chainIdToDexIds[chainInfo.chainId] || []
    data.chainIdToChainMetadata[chainInfo.chainId].wrappedNativeTokenAddress = data.chainIdToWrappedNativeTokenAddress[chainInfo.chainId] || null
  })

  Object.entries(data.chainIdToTokenAddressToTokenMetadata)
  .forEach(([chainId, tokenAddressToTokenMetadata]) => {
    const stablecoins = Object.values(tokenAddressToTokenMetadata).filter(tokenMetadata => data.stablecoinSymbols.includes(tokenMetadata.symbol))

    if (stablecoins.length > 0) {
      if (!data.chainIdToStablecoinAddressToStableCoinMetadata[chainId]) {
        data.chainIdToStablecoinAddressToStableCoinMetadata[chainId] = {}
      }

      stablecoins.forEach(stablecoin => {
        data.chainIdToStablecoinAddressToStableCoinMetadata[chainId][stablecoin.address] = stablecoin
      })
    }
  })

  Object.entries(data.dexIdToChainIdTokenAddressToTokenMetadata)
  .forEach(([dexId, chainIdToTokenAddressToTokenMetadata]) => {
    if (!data.dexIdToChainIdToStablecoinAddressToStablecoinMetadata[dexId]) {
      data.dexIdToChainIdToStablecoinAddressToStablecoinMetadata[dexId] = {}
    }

    Object.entries(chainIdToTokenAddressToTokenMetadata)
    .forEach(([chainId, tokenAddressToTokenMetadata]) => {
      const stablecoins = Object.values(tokenAddressToTokenMetadata).filter(tokenMetadata => data.stablecoinSymbols.includes(tokenMetadata.symbol))

      if (stablecoins.length > 0) {
        if (!data.dexIdToChainIdToStablecoinAddressToStablecoinMetadata[dexId][chainId]) {
          data.dexIdToChainIdToStablecoinAddressToStablecoinMetadata[dexId][chainId] = {}
        }

        stablecoins.forEach(stablecoin => {
          data.dexIdToChainIdToStablecoinAddressToStablecoinMetadata[dexId][chainId][stablecoin.address] = stablecoin
        })
      }
    })
  })

  /* ---
    Write
  --- */

  Object.entries(data.chainIdToChainMetadata).forEach(([chainId, chainMetadata]) => {
    createDirectory(`blockchains/${chainId}`)
    saveJson(`blockchains/${chainId}/metadata.json`, chainMetadata)
  })

  Object.entries(data.chainIdToTokenAddressToTokenMetadata)
  .forEach(([chainId, tokenAddressToTokenMetadata]) => {
    createDirectory(`blockchains/${chainId}`)
    saveJson(`blockchains/${chainId}/tokens.json`, tokenAddressToTokenMetadata)
  })

  Object.entries(data.chainIdToStablecoinAddressToStableCoinMetadata)
  .forEach(([chainId, stablecoinAddressToStableCoinMetadata]) => {
    createDirectory(`blockchains/${chainId}`)
    saveJson(`blockchains/${chainId}/stablecoins.json`, stablecoinAddressToStableCoinMetadata)
  })

  Object.entries(data.dexIdToDexMetadata).forEach(([dexId, dexMetadata]) => {
    delete dexMetadata.__metadata__
    createDirectory(`dexes/${dexId}`)
    saveJson(`dexes/${dexId}/metadata.json`, dexMetadata)
  })

  Object.entries(data.dexIdToChainIdTokenAddressToTokenMetadata).forEach(([dexId, chainIdToTokenAddressToTokenMetadata]) => {
    Object.entries(chainIdToTokenAddressToTokenMetadata).forEach(([chainId, tokenAddressToTokenMetadata]) => {
      createDirectory(`dexes/${dexId}/tokens`)
      saveJson(`dexes/${dexId}/tokens/${chainId}.json`, tokenAddressToTokenMetadata)
    })
  })

  Object.entries(data.dexIdToChainIdToStablecoinAddressToStablecoinMetadata)
  .forEach(([dexId, chainIdToStablecoinAddressToStablecoinMetadata]) => {
    createDirectory(`dexes/${dexId}/stablecoins`)
    Object.entries(chainIdToStablecoinAddressToStablecoinMetadata).forEach(([chainId, stablecoinAddressToStableCoinMetadata]) => {
      saveJson(`dexes/${dexId}/stablecoins/${chainId}.json`, stablecoinAddressToStableCoinMetadata)
    })
  })

  Object.entries(data.dexIdToChainIdToContractNameToContractInfo).forEach(([dexId, chainIdToContractNameToContractInfo]) => {
    Object.entries(chainIdToContractNameToContractInfo).forEach(([chainId, contractNameToContractInfo]) => {
      createDirectory(`dexes/${dexId}/contracts`)
      saveJson(`dexes/${dexId}/contracts/${chainId}.json`, contractNameToContractInfo)
    })
  })

  Object.entries(data.abiNameToAbi).forEach(([abiName, abi]) => {
    createDirectory('abis')
    saveJson(`abis/${abiName}.json`, abi)
  })
}

function getBuildLocation(x) {
  return path.resolve(__dirname, '../data', x)
}

function saveJson(path, json) {
  fs.writeFileSync(getBuildLocation(path), JSON.stringify(json, null, 2), 'utf8')
}

function createDirectory(path) {
  fs.mkdirSync(getBuildLocation(path), { recursive: true })
}

build()
