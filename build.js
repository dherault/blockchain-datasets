const fs = require('fs')
const path = require('path')

const del = require('del')
const tmp = require('tmp-promise')
const clone = require('git-clone/promise')
const axios = require('axios')
const tsFileStruct = require('ts-file-parser')

const aliases = {
  bsc: ['bsc_mainnet'],
  moonbase: ['moonbeam_testnet'],
  harmony: ['harmony_mainnet'],
  goerli: ['görli'],
}

async function build() {
  await del(getBuildLocation('**/*.json'))

  const blockchainIdToTokens = {}
  const blockchainNameToChainId = {}
  const chainIdToBlockchainName = {}
  const dexNameToChainIdToRouterAddress = {
    sushiswap: {},
    fatex: {},
  }
  const dexNameToChainIds = {
    sushiswap: [],
    fatex: [],
  }
  const dexNameToRouterName = {
    sushiswap: 'UniswapV2Router02.json',
    fatex: 'UniswapV2Router02.json',
  }

  /* ---
    https://chainid.network/chains.json
  --- */

  console.log('Parsing https://chainid.network/chains.json')

  const allChains = (await axios.get('https://chainid.network/chains.json')).data

  /* ---
    sushiswap/default-token-list
  --- */

  console.log('Parsing sushiswap/default-token-list')

  let tmpDir = await tmp.dir({ unsafeCleanup: true })

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

    if (json.length) {
      blockchainIdToTokens[json[0].chainId] = json
    }

  })

  await tmpDir.cleanup()

  /* ---
    sushiswap/sushiswap-sdk
  --- */

  console.log('Parsing sushiswap/sushiswap-sdk')

  tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone('git@github.com:sushiswap/sushiswap-sdk.git', tmpDir.path)

  let chainIdEnumLocation = path.join(tmpDir.path, 'src/enums/ChainId.ts')
  let chainIdEnum = fs.readFileSync(chainIdEnumLocation).toString()

  tsFileStruct.parseStruct(chainIdEnum, {}, chainIdEnumLocation).enumDeclarations[0].members
  .forEach(({ name, value }) => {
    const lowerName = correctBlockchainName(name)

    blockchainNameToChainId[lowerName] = value
    chainIdToBlockchainName[value] = lowerName
    dexNameToChainIds.sushiswap.push(value)
  })

  dexNameToChainIdToRouterAddress.sushiswap = require(path.join(tmpDir.path, 'src/constants/addresses.ts')).ROUTER_ADDRESS

  await tmpDir.cleanup()

  /* ---
    FATEx-DAO/fatex-dex-sdk
  --- */

  console.log('Parsing FATEx-DAO/fatex-dex-sdk')

  tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone('git@github.com:FATEx-DAO/fatex-dex-sdk.git', tmpDir.path)

  chainIdEnumLocation = path.join(tmpDir.path, 'src/constants.ts')
  chainIdEnum = fs.readFileSync(chainIdEnumLocation).toString()

  tsFileStruct.parseStruct(chainIdEnum, {}, chainIdEnumLocation)
  .enumDeclarations
  .find(({ name }) => name === 'ChainId')
  .members
  .forEach(({ name, value }) => {
    const lowerName = correctBlockchainName(name)

    if (!blockchainNameToChainId[lowerName]) blockchainNameToChainId[lowerName] = value
    if (!chainIdToBlockchainName[value]) chainIdToBlockchainName[value] = lowerName
    dexNameToChainIds.fatex.push(value)
  })

  /* ---
    FATEx-DAO/fatex-dex-protocol
  --- */

  console.log('Parsing FATEx-DAO/fatex-dex-protocol')

  tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone('git@github.com:FATEx-DAO/fatex-dex-protocol.git', tmpDir.path)

  const smartContractsDeploymentsLocation = path.join(tmpDir.path, 'deployments')

  fs.readdirSync(smartContractsDeploymentsLocation)
  .forEach(folder => {
    if (fs.lstatSync(path.join(smartContractsDeploymentsLocation, folder)).isDirectory()) {
      const json = require(path.join(smartContractsDeploymentsLocation, folder, 'UniswapV2Router02.json'))

      dexNameToChainIdToRouterAddress.fatex[blockchainNameToChainId[correctBlockchainName(folder)]] = json.address
    }
  })

  /* ---
    save
  --- */

  saveJson(getBuildLocation('allChains.json'), allChains)
  saveJson(getBuildLocation('blockchainIdToTokens.json'), blockchainIdToTokens)
  saveJson(getBuildLocation('blockchainNameToChainId.json'), blockchainNameToChainId)
  saveJson(getBuildLocation('chainIdToBlockchainName.json'), chainIdToBlockchainName)
  saveJson(getBuildLocation('dexNameToChainIds.json'), dexNameToChainIds)
  saveJson(getBuildLocation('dexNameToChainIdToRouterAddress.json'), dexNameToChainIdToRouterAddress)
  saveJson(getBuildLocation('dexNameToRouterName.json'), dexNameToRouterName)

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

build()
