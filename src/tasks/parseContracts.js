const fs = require('fs')
const path = require('path')

const tmp = require('tmp-promise')
const clone = require('git-clone/promise')

async function parseContracts(data, dexId) {
  const dexMetadata = data.dexIdToDexMetadata[dexId]

  console.log(`Parsing ${dexMetadata.__metadata__.contractsGitUrl}`)

  const tmpDir = await tmp.dir({ unsafeCleanup: true })

  await clone(dexMetadata.__metadata__.contractsGitUrl, tmpDir.path)

  const defaultContractNameToContractInfo = {
    UniswapV2Pair: {
      address: 'depends on the pair',
      abi: data.abiNameToAbi.UniswapV2Pair,
    },
  }

  const smartContractsDeploymentsLocation = path.join(tmpDir.path, 'deployments')

  data.dexIdToChainIdToContractNameToContractInfo[dexId] = {}

  fs.readdirSync(smartContractsDeploymentsLocation)
  .forEach(folder => {
    if (fs.lstatSync(path.join(smartContractsDeploymentsLocation, folder)).isDirectory()) {
      const chainId = fs.readFileSync(path.join(smartContractsDeploymentsLocation, folder, '.chainId'), 'utf8')

      if (!data.chainIdToDexIds[chainId]) {
        data.chainIdToDexIds[chainId] = []
      }

      data.chainIdToDexIds[chainId].push(dexMetadata.id)

      if (!data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId]) {
        data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId] = { ...defaultContractNameToContractInfo }
      }

      fs.readdirSync(path.join(smartContractsDeploymentsLocation, folder))
      .filter(file => file.endsWith('.json'))
      .forEach(file => {
        let json = {}

        try {
          json = JSON.parse(fs.readFileSync(path.join(smartContractsDeploymentsLocation, folder, file), 'utf8'))
        }
        catch (e) {
          console.log(`Error parsing ${dexMetadata.__metadata__.contractsGitUr} JSON`, file)
        }

        const contractName = file.replace('.json', '')

        data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId][contractName] = {
          address: json.address,
          abi: json.abi,
        }
      })
    }
  })
}

module.exports = parseContracts
