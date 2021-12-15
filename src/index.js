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
    // chainNameToChainId: {},
    chainIdToTokenAddressToTokenMetadata: {},
    dexIdToChainIdToContractNameToContractInfo: {},
    dexIdToChainIdTokenAddressToTokenMetadata: {},
    blockchainIdToDexIds: {},
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
    data.chainIdToChainMetadata[chainInfo.chainId].dexes = data.blockchainIdToDexIds[chainInfo.chainId] || []
  })

  /* ---
    Write
  --- */

  createDirectory(getBuildLocation('blockchains'))

  Object.entries(data.chainIdToChainMetadata).forEach(([chainId, chainMetadata]) => {
    saveJson(getBuildLocation(`blockchains/${chainId}.json`), chainMetadata)
  })

  Object.entries(data.dexIdToChainIdToContractNameToContractInfo).forEach(([dexId, chainIdToContractNameToContractInfo]) => {
    Object.entries(chainIdToContractNameToContractInfo).forEach(([chainId, contractNameToContractInfo]) => {
      createDirectory(getBuildLocation(`dexes/${dexId}/contracts`))
      saveJson(getBuildLocation(`dexes/${dexId}/contracts/${chainId}.json`), contractNameToContractInfo)
    })
  })

  Object.entries(data.dexIdToChainIdTokenAddressToTokenMetadata).forEach(([dexId, chainIdToTokenAddressToTokenMetadata]) => {
    Object.entries(chainIdToTokenAddressToTokenMetadata).forEach(([chainId, tokenAddressToTokenMetadata]) => {
      createDirectory(getBuildLocation(`dexes/${dexId}/tokens`))
      saveJson(getBuildLocation(`dexes/${dexId}/tokens/${chainId}.json`), tokenAddressToTokenMetadata)
    })
  })

  Object.entries(data.dexIdToDexMetadata).forEach(([dexId, dexMetadata]) => {
    createDirectory(getBuildLocation(`dexes/${dexId}`))
    saveJson(getBuildLocation(`dexes/${dexId}/metadata.json`), dexMetadata)
  })

  createDirectory(getBuildLocation('tokens'))

  Object.entries(data.chainIdToTokenAddressToTokenMetadata)
  .forEach(([blockchainId, tokens]) => {
    saveJson(getBuildLocation(`tokens/${blockchainId}.json`), tokens)
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
