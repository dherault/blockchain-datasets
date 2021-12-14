const fs = require('fs')
const path = require('path')

const del = require('del')
const tmp = require('tmp-promise')
const clone = require('git-clone/promise')
const axios = require('axios')

const aliases = {
  bsc: ['bsc_mainnet'],
  moonbase: ['moonbeam_testnet'],
  harmony: ['harmony_mainnet'],
  goerli: ['görli'],
}

async function build() {
  await del(getBuildLocation('*'))

  const dexIdToInfo = {
    sushiswap: {
      name: 'SushiSwap',
      url: 'https://sushi.com',
      contractsRepositoryUrl: 'https://github.com/sushiswap/sushiswap',
      contractsRepositoryGitUrl: 'git@github.com:sushiswap/sushiswap.git',
      contractTypeToContractName: {
        pair: 'UniswapV2Pair',
        factory: 'UniswapV2Factory',
        router: 'UniswapV2Router02',
      },
    },
  }
  const blockchainIdToTokens = {}
  const chainNameToChainId = {}
  const dexIdToChainIdToContractNameToContractInfo = {}
  const blockchainIdToDexIds = {}

  /* ---
    https://chainid.network/chains.json
  --- */

  console.log('Parsing https://chainid.network/chains.json')

  const chainInfos = (await axios.get('https://chainid.network/chains.json')).data

  chainInfos.forEach(chainInfo => {
    chainNameToChainId[chainInfo.network.toLowerCase()] = chainInfo.chainId
  })

  /* ---
    sushiswap/sushiswap
  --- */

  console.log('Parsing sushiswap/sushiswap')

  let tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone(dexIdToInfo.sushiswap.contractsRepositoryGitUrl, tmpDir.path)

  const defaultContractNameToContractInfo = {
    UniswapV2Pair: {
      address: 'depends on the pair',
      abi: require('./inputs/UniswapV2Pair.abi.json'),
    },
  }

  const smartContractsDeploymentsLocation = path.join(tmpDir.path, 'deployments')

  dexIdToChainIdToContractNameToContractInfo.sushiswap = {}

  fs.readdirSync(smartContractsDeploymentsLocation)
  .forEach(folder => {
    if (fs.lstatSync(path.join(smartContractsDeploymentsLocation, folder)).isDirectory()) {
      const chainId = fs.readFileSync(path.join(smartContractsDeploymentsLocation, folder, '.chainId'), 'utf8')

      if (!blockchainIdToDexIds[chainId]) {
        blockchainIdToDexIds[chainId] = []
      }

      blockchainIdToDexIds[chainId].push('sushiswap')

      if (!dexIdToChainIdToContractNameToContractInfo.sushiswap[chainId]) {
        dexIdToChainIdToContractNameToContractInfo.sushiswap[chainId] = defaultContractNameToContractInfo
      }

      fs.readdirSync(path.join(smartContractsDeploymentsLocation, folder))
      .filter(file => file.endsWith('.json'))
      .forEach(file => {
        let json = {}

        try {
          json = JSON.parse(fs.readFileSync(path.join(smartContractsDeploymentsLocation, folder, file), 'utf8'))
        }
        catch (e) {
          console.log('Error parsing sushiswap/suhsiswap JSON', file)
        }

        const contractName = file.replace('.json', '')

        dexIdToChainIdToContractNameToContractInfo.sushiswap[chainId][contractName] = {
          address: json.address,
          abi: json.abi,
        }
      })
    }
  })

  /* ---
    sushiswap/default-token-list
  --- */

  console.log('Parsing sushiswap/default-token-list')

  tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone('git@github.com:sushiswap/default-token-list.git', tmpDir.path)

  fs.readdirSync(path.join(tmpDir.path, 'tokens'))
  .forEach(file => {
    let json = []

    try {
      json = require(path.join(tmpDir.path, 'tokens', file))
    }
    catch (e) {
      console.log('Error parsing sushiswap/default-token-list JSON', file)
    }

    if (json.length) blockchainIdToTokens[json[0].chainId] = json
  })

  await tmpDir.cleanup()

  /* ---
    sushiswap/sushiswap-sdk
  --- */

  // console.log('Parsing sushiswap/sushiswap-sdk')

  // tmpDir = await tmp.dir({ unsafeCleanup: true })

  // await clone('git@github.com:sushiswap/sushiswap-sdk.git', tmpDir.path)

  // // const sushsiswapConstants = require(path.join(tmpDir.path, 'src/constants/addresses.ts'))

  // // console.log('sushsiswapConstants', Object.keys(sushsiswapConstants))

  // // dexNamIdhainIdToContractTypeToContract.sushiswap

  // await tmpDir.cleanup()

  /* ---
    FATEx-DAO/fatex-dex-sdk
  --- */

  // console.log('Parsing FATEx-DAO/fatex-dex-sdk')

  // tmpDir = await tmp.dir({ unsafeCleanup: true })

  // await clone('git@github.com:FATEx-DAO/fatex-dex-sdk.git', tmpDir.path)

  // const chainIdEnumLocation = path.join(tmpDir.path, 'src/constants.ts')
  // const chainIdEnum = fs.readFileSync(chainIdEnumLocation).toString()

  // tsFileStruct.parseStruct(chainIdEnum, {}, chainIdEnumLocation)
  // .enumDeclarations
  // .find(({ name }) => name === 'ChainId')
  // .members
  // .forEach(({ name, value }) => {
  //   const lowerName = correctBlockchainName(name)

  //   if (!blockchainNameToChainId[lowerName]) blockchainNameToChainId[lowerName] = value
  //   if (!chainIdToBlockchainName[value]) chainIdToBlockchainName[value] = lowerName
  //   dexNameToChainIds.fatex.push(value)
  // })

  /* ---
    FATEx-DAO/fatex-dex-protocol
  --- */

  // console.log('Parsing FATEx-DAO/fatex-dex-protocol')

  // tmpDir = await tmp.dir({ unsafeCleanup: true })

  // await clone('git@github.com:FATEx-DAO/fatex-dex-protocol.git', tmpDir.path)

  // smartContractsDeploymentsLocation = path.join(tmpDir.path, 'deployments')

  // fs.readdirSync(smartContractsDeploymentsLocation)
  // .forEach(folder => {
  //   if (fs.lstatSync(path.join(smartContractsDeploymentsLocation, folder)).isDirectory()) {
  //     const json = require(path.join(smartContractsDeploymentsLocation, folder, 'UniswapV2Router02.json'))

  //     dexNameToChainIdToRouterAddress.fatex[blockchainNameToChainId[correctBlockchainName(folder)]] = json.address
  //   }
  // })

  /* ---
    post-processing
  --- */

  const chainIdToChainMetadata = {}

  chainInfos.forEach(chainInfo => {
    chainIdToChainMetadata[chainInfo.chainId] = chainInfo
    chainIdToChainMetadata[chainInfo.chainId].dexes = blockchainIdToDexIds[chainInfo.chainId] || []
  })

  /* ---
    save
  --- */

  saveJson(getBuildLocation('chainIdToChainMetadata.json'), chainIdToChainMetadata)

  Object.entries(dexIdToChainIdToContractNameToContractInfo).forEach(([dexId, chainIdToContractNameToContractInfo]) => {
    Object.entries(chainIdToContractNameToContractInfo).forEach(([chainId, contractNameToContractInfo]) => {
      createDirectory(getBuildLocation(`dexes/${dexId}/contracts`))
      saveJson(getBuildLocation(`dexes/${dexId}/contracts/${chainId}.json`), contractNameToContractInfo)
    })
  })

  Object.entries(dexIdToInfo).forEach(([dexId, info]) => {
    createDirectory(getBuildLocation(`dexes/${dexId}`))
    saveJson(getBuildLocation(`dexes/${dexId}/info.json`), info)
  })

  createDirectory(getBuildLocation('tokens'))
  Object.entries(blockchainIdToTokens)
  .forEach(([blockchainId, tokens]) => {
    saveJson(getBuildLocation(`tokens/${blockchainId}.json`), tokens)
  })
}

function correctBlockchainName(name) {
  let lowerName = name.toLowerCase()

  for (const [alias, otherNames] of Object.entries(aliases)) {
    if (otherNames.includes(lowerName)) {
      lowerName = alias
      break
    }
  }

  return lowerName
}

function getBuildLocation(x) {
  return path.resolve(__dirname, 'data', x)
}

function saveJson(path, json) {
  fs.writeFileSync(path, JSON.stringify(json, null, 2), 'utf8')
}

function createDirectory(path) {
  fs.mkdirSync(path, { recursive: true })
}

build()
