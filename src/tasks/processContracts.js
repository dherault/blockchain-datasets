
function processContracts(data, dexId) {
  const dexMetadata = data.dexIdToDexMetadata[dexId]

  console.log(`Processing contracts ${dexMetadata.name}`)

  const { chainIdToFactoryAddress, chainIdToRouterAddress } = dexMetadata.__metadata__

  Object.keys(chainIdToRouterAddress).forEach(chainId => {
    if (!data.chainIdToDexIds[chainId]) {
      data.chainIdToDexIds[chainId] = []
    }

    data.chainIdToDexIds[chainId].push(dexMetadata.id)
  })

  const defaultContractNameToContractInfo = {
    UniswapV2Pair: {
      address: 'depends on the pair',
      abi: data.abiNameToAbi.UniswapV2Pair,
    },
  }

  if (!data.dexIdToChainIdToContractNameToContractInfo[dexId]) {
    data.dexIdToChainIdToContractNameToContractInfo[dexId] = {}
  }

  Object.entries(chainIdToRouterAddress).forEach(([chainId, routerAddress]) => {
    if (!data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId]) {
      data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId] = { ...defaultContractNameToContractInfo }
    }

    data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId].router = {
      address: routerAddress,
      abi: data.abiNameToAbi.UniswapV2Router02,
    }
  })

  Object.entries(chainIdToFactoryAddress).forEach(([chainId, factoryAddress]) => {
    if (!data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId]) {
      data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId] = { ...defaultContractNameToContractInfo }
    }

    data.dexIdToChainIdToContractNameToContractInfo[dexId][chainId].factory = {
      address: factoryAddress,
      abi: data.abiNameToAbi.UniswapV2Factory,
    }
  })
}

module.exports = processContracts
