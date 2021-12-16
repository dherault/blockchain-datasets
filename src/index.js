const fs = require('fs')
const path = require('path')

const del = require('del')
const axios = require('axios')

const parseContracts = require('./tasks/parseContracts')
const parseTokens = require('./tasks/parseTokens')

async function build() {
  await del(getBuildLocation('*'))

  const data = {
    dexIdToDexMetadata: {
      sushiswap: {
        id: 'sushiswap',
        name: 'SushiSwap',
        url: 'https://sushi.com',
        tokensGitUrl: 'git@github.com:sushiswap/default-token-list.git',
        tokensLocation: 'tokens',
        contractsGitUrl: 'git@github.com:sushiswap/sushiswap.git',
        contractTypeToContractName: {
          pair: 'UniswapV2Pair',
          factory: 'UniswapV2Factory',
          router: 'UniswapV2Router02',
        },
      },
      fatex: {
        id: 'fatex',
        name: 'FATEx',
        url: 'https://fatex.io',
        tokensGitUrl: 'git@github.com:FATEx-DAO/default-token-list.git',
        tokensLocation: 'src/tokens',
        contractsGitUrl: 'git@github.com:FATEx-DAO/fatex-dex-protocol.git',
        contractTypeToContractName: {
          pair: 'UniswapV2Pair',
          factory: 'UniswapV2Factory',
          router: 'UniswapV2Router02',
        },
      },
    },
    abiNameToAbi: {
      ERC20: require(path.resolve(__dirname, '../inputs/ERC20.abi.json')),
      UniswapV2Pair: require(path.resolve(__dirname, '../inputs/UniswapV2Pair.abi.json')),
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

  /* ---
    fatex
  --- */

  await parseContracts(data, 'fatex')
  await parseTokens(data, 'fatex')

  /* ---
    Post-processing
  --- */

  chainInfos.forEach(chainInfo => {
    data.chainIdToChainMetadata[chainInfo.chainId] = chainInfo
    data.chainIdToChainMetadata[chainInfo.chainId].dexes = data.chainIdToDexIds[chainInfo.chainId] || []
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
    createDirectory(getBuildLocation(`blockchains/${chainId}`))
    saveJson(getBuildLocation(`blockchains/${chainId}/metadata.json`), chainMetadata)
  })

  Object.entries(data.chainIdToTokenAddressToTokenMetadata)
  .forEach(([chainId, tokenAddressToTokenMetadata]) => {
    createDirectory(getBuildLocation(`blockchains/${chainId}`))
    saveJson(getBuildLocation(`blockchains/${chainId}/tokens.json`), tokenAddressToTokenMetadata)
  })

  Object.entries(data.chainIdToStablecoinAddressToStableCoinMetadata)
  .forEach(([chainId, stablecoinAddressToStableCoinMetadata]) => {
    createDirectory(getBuildLocation(`blockchains/${chainId}`))
    saveJson(getBuildLocation(`blockchains/${chainId}/stablecoins.json`), stablecoinAddressToStableCoinMetadata)
  })

  Object.entries(data.dexIdToDexMetadata).forEach(([dexId, dexMetadata]) => {
    createDirectory(getBuildLocation(`dexes/${dexId}`))
    saveJson(getBuildLocation(`dexes/${dexId}/metadata.json`), dexMetadata)
  })

  Object.entries(data.dexIdToChainIdTokenAddressToTokenMetadata).forEach(([dexId, chainIdToTokenAddressToTokenMetadata]) => {
    Object.entries(chainIdToTokenAddressToTokenMetadata).forEach(([chainId, tokenAddressToTokenMetadata]) => {
      createDirectory(getBuildLocation(`dexes/${dexId}/tokens`))
      saveJson(getBuildLocation(`dexes/${dexId}/tokens/${chainId}.json`), tokenAddressToTokenMetadata)
    })
  })

  Object.entries(data.dexIdToChainIdToStablecoinAddressToStablecoinMetadata)
  .forEach(([dexId, chainIdToStablecoinAddressToStablecoinMetadata]) => {
    createDirectory(getBuildLocation(`dexes/${dexId}/stablecoins`))
    Object.entries(chainIdToStablecoinAddressToStablecoinMetadata).forEach(([chainId, stablecoinAddressToStableCoinMetadata]) => {
      saveJson(getBuildLocation(`dexes/${dexId}/stablecoins/${chainId}.json`), stablecoinAddressToStableCoinMetadata)
    })
  })

  Object.entries(data.dexIdToChainIdToContractNameToContractInfo).forEach(([dexId, chainIdToContractNameToContractInfo]) => {
    Object.entries(chainIdToContractNameToContractInfo).forEach(([chainId, contractNameToContractInfo]) => {
      createDirectory(getBuildLocation(`dexes/${dexId}/contracts`))
      saveJson(getBuildLocation(`dexes/${dexId}/contracts/${chainId}.json`), contractNameToContractInfo)
    })
  })

  Object.entries(data.abiNameToAbi).forEach(([abiName, abi]) => {
    createDirectory(getBuildLocation('abis'))
    saveJson(getBuildLocation(`abis/${abiName}.json`), abi)
  })
}

function getBuildLocation(x) {
  return path.resolve(__dirname, '../data', x)
}

function saveJson(path, json) {
  fs.writeFileSync(path, JSON.stringify(json, null, 2), 'utf8')
}

function createDirectory(path) {
  fs.mkdirSync(path, { recursive: true })
}

build()
