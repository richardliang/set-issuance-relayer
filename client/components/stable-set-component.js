import React, { Component } from 'react'
import {connect} from 'react-redux'
import { Grid, Form, Button, Segment, Header, Divider } from 'semantic-ui-react'
import addresses from '../addresses'
import BigNumber from 'bignumber.js'
import SetProtocol, {SignedIssuanceOrder} from 'setprotocol.js'
import {createNewOrder, removeFilledOrExpiredOrder} from '../store'
import { assetDataUtils, orderHashUtils, signatureUtils } from '0x.js';
import { SignerType } from '@0xproject/types';

class StableSetComponent extends Component {
  constructor(props){
    super(props)

    this.state = {
      account: "",
      loading: false,
      stableSetQty: 0,
      price: 0,
      details: {},
      seconds: 0,
      issueQty: 0,
      redeemQty: 0,
      balance: 0,
      rebalancingBalance: 0,
      issueRebalancingQty: 0,
      redeemRebalancingQty: 0,
      proposedTUSDRatio: 0.5,
      proposedDAIRatio: 0.5,
      bidQuantity: 0,
      rebalancingSetSymbol: "",
      rebalancingSetName: "",
    }
  }

  async componentDidMount() {
    const {setProtocol} = this.props

    this.setState({
      loading: true
    })
    const accounts = await setProtocol.web3.eth.getAccounts()
    const details = await setProtocol.setToken.getDetails(addresses.stableSet)
    const setBalance = await setProtocol.erc20.getBalanceOfAsync(addresses.stableSet, accounts[0])
    const rebalancingSetBalance = await setProtocol.erc20.getBalanceOfAsync(addresses.rebalancingStableSetAddress, accounts[0])
    this.setState({
      account: accounts[0],
      balance: (setBalance.toNumber()/(10 ** 18)).toFixed(4),
      rebalancingBalance: (rebalancingSetBalance.toNumber()/(10**18)).toFixed(4),
      details: details,
      loading: false
    })
    const minNatUnit = await setProtocol.calculateMinimumNaturalUnitAsync(
      [addresses.trueUsd,addresses.dai, addresses.stably],
    )

    console.log("NatUnit", minNatUnit.toNumber())
    console.log("Details", details)
  }

  approveEverything = async () => {
    const {setProtocol} = this.props
    const {account} = this.state
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.trueUsd, { from: account });
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.dai, { from: account });
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.stably, { from: account });
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.weth, { from: account });
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.stableSet, { from: account });
  }

  handleCreateSet = async () => {
    const {setProtocol} = this.props
    const {account} = this.state
    const componentAddresses = [addresses.dai, addresses.trueUsd, addresses.stably];
    // const { units, naturalUnit } = await setProtocol.calculateSetUnitsAsync(
    //   componentAddresses,
    //   [new BigNumber(1), new BigNumber(1), new BigNumber(1)],    
    //   [new BigNumber(0.3), new BigNumber(0.3), new BigNumber(.4)], // Each coin has a 50% allocation
    //   new BigNumber(1),                         // StableSet will have a 1 target price
    // );
    const units = [new BigNumber(3 * 10**12), new BigNumber(3 * 10**12), new BigNumber(4)]
    const naturalUnit = new BigNumber(10 ** 13)
    console.log("Natural Units", units, naturalUnit)

    const name = 'StableSet';
    const symbol = 'STBL';

    const txOpts = {
      from: account,
      gas: 4000000,
      gasPrice: 8000000000,
    };

    const txHash = await setProtocol.createSetAsync(
      componentAddresses,
      units,
      naturalUnit,
      name,
      symbol,
      txOpts,
      );
    console.log("in progress")
    const mined = await setProtocol.awaitTransactionMinedAsync(txHash)
    console.log("mined")
    if(mined){
      let setAddress =  await setProtocol.getSetAddressFromCreateTxHashAsync(txHash);
      console.log("StableSet Address: ", setAddress)
      
    }
  }

  handleCreateSetForRebalancing = async () => {
    const { setProtocol } = this.props;
    const {account, rebalancingSetName, rebalancingSetSymbol} = this.state
    const {proposedTUSDRatio, proposedDAIRatio} = this.state

    const componentAddresses = [addresses.dai, addresses.trueUsd];
    const componentUnits = [new BigNumber(proposedDAIRatio*10), new BigNumber(proposedTUSDRatio*10)];
    const naturalUnit = new BigNumber(10);
    const name = rebalancingSetName;
    const symbol = rebalancingSetSymbol;
    const txOpts = {
      from: account,
      gas: 4000000,
      gasPrice: 8000000000
    };

    const txHash = await setProtocol.createSetAsync(
      componentAddresses,
      componentUnits,
      naturalUnit,
      name,
      symbol,
      txOpts
    );

    console.log("Transaction Hash",txHash)
    const mined = await setProtocol.awaitTransactionMinedAsync(txHash)
    console.log("Mined")
    if(mined){
      const set2Address = await setProtocol.getSetAddressFromCreateTxHashAsync(
        txHash
      );

      console.log("Set 2 Address", set2Address);
      this.setState({
        weightedStableSetAddress: set2Address,
        proposedTUSDRatio: 0,
        proposedDAIRatio: 0
      })
    }
  }

  createDynamicStableSet = async () => {
    const {setProtocol} = this.props
    const {account} = this.state
    console.log(account)
    const manager = account;      // Make yourself the manager!
    const initialSet = addresses.stableSet;
    const unitShares = new BigNumber(10**10); 

    const TWO_MIN = 60*2;
    const ONE_MIN = 60;

    const proposalPeriod = new BigNumber(ONE_MIN);
    const rebalanceInterval = new BigNumber(TWO_MIN - ONE_MIN)
    const entranceFee = new BigNumber(0)
    const rebalanceFee = new BigNumber(0)

    const name = 'Dynamic StableSet Rebalance';
    const symbol = 'DSTBL';
    const txOpts = {
      from: account.toLowerCase(),
      gas: 4000000,
      gasPrice: 8000000000,
    };

    console.log(txOpts)

    console.log(initialSet)
    const txHash = await setProtocol.createRebalancingSetTokenAsync(
      manager,
      initialSet,
      unitShares,
      proposalPeriod,
      rebalanceInterval,
      entranceFee,
      rebalanceFee,
      name,
      symbol,
      txOpts,
      );
    const mined = await setProtocol.awaitTransactionMinedAsync(txHash)
    if(mined){
      const rebalanceAddress = await setProtocol.getSetAddressFromCreateTxHashAsync(txHash);
      console.log("Rebalancing Set Address: ", rebalanceAddress)

      return rebalanceAddress
      
    }
  };

  issueRebalancingStableSet = async () => {
    const {setProtocol} = this.props
    const {account} = this.state
    const {issueRebalancingQty} = this.state
    const issueQuantity = new BigNumber(new BigNumber(10 ** 18).mul(issueRebalancingQty));
    const isMultipleOfNaturalUnit = await setProtocol.setToken.isMultipleOfNaturalUnitAsync(addresses.rebalancingStableSetAddress, issueQuantity);
    // const txHash = await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.rebalancingStableSetAddress, { from: account });
    // const mined = await setProtocol.awaitTransactionMinedAsync(txHash)
    if (isMultipleOfNaturalUnit) {
      try {
        const txHashIssued = await setProtocol.issueAsync(
          addresses.rebalancingStableSetAddress,
          issueQuantity,
          {
            from: account,
            gas: 2000000,
            gasPrice: 8000000000,
          },
        );
        const minedIssueAsync = await setProtocol.awaitTransactionMinedAsync(txHashIssued)

        if(minedIssueAsync){
          this.setState({
            rebalancingBalance: issueRebalancingQty
          })
        }
      } catch (err) {
        console.error(`Error when issuing a new Set token: ${err}`)
      }
    }
    console.error(`Issue quantity is not multiple of natural unit. Confirm that your issue quantity is divisible by the natural unit.`);
  };

  issueStableSet = async () => {
    const {setProtocol} = this.props
    const {account} = this.state
    const {issueQty, balance} = this.state
    const issueQuantity = new BigNumber(new BigNumber(10 ** 18).mul(issueQty));

    const isMultipleOfNaturalUnit = await setProtocol.setToken.isMultipleOfNaturalUnitAsync(addresses.stableSet, issueQuantity);
    
    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.trueUsd, { from: account });
    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.dai, { from: account });
    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.stably, { from: account });
    // const txHash = await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.stableSet, { from: account });
    // const mined = await setProtocol.awaitTransactionMinedAsync(txHash)

    if (isMultipleOfNaturalUnit) {
      try {

        const txHashIssued = await setProtocol.issueAsync(
          addresses.stableSet,
          issueQuantity,
          {
            from: account,
            gas: 2000000,
            gasPrice: 8000000000,
          },
        );
        const minedIssued = await setProtocol.awaitTransactionMinedAsync(txHashIssued)
        if(minedIssued){
          const newBalance = (Number(balance)+issueQty).toFixed(4)
          this.setState({
            issueQty: 0,
            balance: newBalance
          })
          
        }
      } catch (err) {
        console.error(`Error when issuing a new Set token: ${err}`)
      }
    }
    console.error(`Issue quantity is not multiple of natural unit. Confirm that your issue quantity is divisible by the natural unit.`);
  };

  redeemRebalancingStableSet = async () => {
    const {setProtocol} = this.props
    const {redeemRebalancingQty, account} = this.state


    const quantity = new BigNumber(new BigNumber(10 ** 18).mul(redeemRebalancingQty));
    const withdraw = true;
    const tokensToExclude = [];
    const txOpts = {
      from: account,
      gas: 4000000,
      gasPrice: 8000000000,
    };

    const txHash = await setProtocol.redeemAsync(
      addresses.rebalancingStableSetAddress,
      quantity,
      withdraw,
      tokensToExclude,
      txOpts,
      );

    const mined = await setProtocol.awaitTransactionMinedAsync(txHash)
    if(mined){
      console.log("Mined")
      this.setState({
        redeemRebalancingQty: 0,
      })
    }
  };

  redeemStableSet = async () => {
    const {setProtocol} = this.props
    const {redeemQty, balance, account} = this.state

    const quantity = new BigNumber(new BigNumber(10 ** 18).mul(redeemQty));
    const withdraw = true;
    const tokensToExclude = [];
    const txOpts = {
      from: account,
      gas: 4000000,
      gasPrice: 8000000000,
    };

    const txHash = await setProtocol.redeemAsync(
      addresses.stableSet,
      quantity,
      withdraw,
      tokensToExclude,
      txOpts,
      );

    const mined = await setProtocol.awaitTransactionMinedAsync(txHash)
    if(mined){
      console.log("Mined")
      const newBalance = (Number(balance)-redeemQty).toFixed(4)
      this.setState({
        redeemQty: 0,
        balance: newBalance
      })
    }
  };

  createIssuanceOrderWethStableSet = async () => {
    const {setProtocol} = this.props
    const {account} = this.state
    const {stableSetQty, price, seconds, details} = this.state
    const makerAddress = account.toLowerCase()


    const wethQty = Math.floor(stableSetQty*price*1000000)/1000000

    const quantity = new BigNumber(new BigNumber(10**13).mul(stableSetQty))

    const requiredComponents = details.components.map(component => component.address);

    // const components = await setProtocol.orders.calculateRequiredComponentsAndUnitsAsync(
    //   addresses.stableSet,
    //   makerAddress,
    //   quantity,
    // );
    console.log(details)

    const requiredComponentAmounts = details.components.map(component => component.unit);

    // const requiredComponentAmounts = details.components.map(component => new BigNumber(new BigNumber(10**17).mul(component.unit).mul(stableSetQty)))

    console.log(requiredComponents, requiredComponentAmounts)

    const makerToken = addresses.weth;
    const makerTokenAmount = new BigNumber(new BigNumber(10**18).mul(wethQty))
    const expiration = setProtocol.orders.generateExpirationTimestamp(seconds);

    const relayerAddress = SetProtocol.NULL_ADDRESS
    const relayerToken = SetProtocol.NULL_ADDRESS
    const makerRelayerFee = new BigNumber(0);
    const takerRelayerFee = new BigNumber(0);
    const salt = new BigNumber(Date.now())
    const txOpts = {
      from: makerAddress,
      gas: 200000,
      gasPrice: 8000000000
    };

    const signedIssuanceOrder = await setProtocol.orders.createSignedOrderAsync(
      addresses.stableSet,
      quantity,
      requiredComponents,
      requiredComponentAmounts,
      makerAddress,
      makerToken,
      makerTokenAmount,
      expiration,
      relayerAddress,
      relayerToken,
      makerRelayerFee,
      takerRelayerFee,
      salt,
    );

    const JSONOrder = JSON.stringify(signedIssuanceOrder)

    console.log("Order", JSONOrder);

    await this.props.createNewOrder(JSONOrder)
  }

  check0xAllowance = async (index) => {
    const {setProtocol, signedIssuanceOrders} = this.props
    const {account} = this.state
    const zeroExMaker = account;

    const orderObj = signedIssuanceOrders.find(order => order.id === index)
    const signedIssuanceOrder = orderObj.signedIssuanceOrder

    const allowanceTrueUsd = await setProtocol.erc20.getAllowanceAsync(
    addresses.trueUsd,
    zeroExMaker,
    addresses.ERC20Proxy,
    )

    const allowanceDai = await setProtocol.erc20.getAllowanceAsync(
      addresses.trueUsd,
      zeroExMaker,
      addresses.ERC20Proxy,
      )
    if(allowanceTrueUsd.comparedTo(signedIssuanceOrder.quantity)===-1){  
      await setProtocol.erc20.approveAsync(
        addresses.trueUsd,
        addresses.ERC20Proxy,
        new BigNumber(5000000000000000000000), 
        { from: zeroExMaker },
      );
    }
    if(allowanceDai.comparedTo(signedIssuanceOrder.quantity)===-1){  
      await setProtocol.erc20.approveAsync(
        addresses.dai,
        addresses.ERC20Proxy,
        new BigNumber(5000000000000000000000), 
        { from: zeroExMaker },
      );
    }
  }

  fillZeroExIssuanceOrderWethStableSet = async (index) => {
    const {setProtocol,signedIssuanceOrders} = this.props
    const {account} = this.state

    const orderObj = signedIssuanceOrders.find(order => order.id === index)
    const signedIssuanceOrder = orderObj.signedIssuanceOrder

    const zeroExMaker = account.toLowerCase();
    const takerAddress = account.toLowerCase()

    await this.check0xAllowance(index);



    const fillQuantity = signedIssuanceOrder.quantity
    console.log("fill quantity", fillQuantity)
    const zeroExOrderTrueUSD = {
      exchangeAddress: addresses.Exchange,
      expirationTimeSeconds: setProtocol.orders.generateExpirationTimestamp(180),
      feeRecipientAddress: SetProtocol.NULL_ADDRESS,
      makerAddress: zeroExMaker,
      makerAssetAmount: new BigNumber(fillQuantity.dividedBy(10).mul(3)),
      makerAssetData: assetDataUtils.encodeERC20AssetData(addresses.trueUsd),
      makerFee: new BigNumber(0),
      salt: setProtocol.orders.generateSalt(),
      senderAddress: SetProtocol.NULL_ADDRESS,
      takerAddress: SetProtocol.NULL_ADDRESS,
      takerAssetAmount: new BigNumber(signedIssuanceOrder.makerTokenAmount.dividedBy(10).mul(3)),
      takerAssetData: assetDataUtils.encodeERC20AssetData(addresses.weth),
      takerFee: new BigNumber(0),
    };

    const zeroExOrderStably = {
      exchangeAddress: addresses.Exchange,
      expirationTimeSeconds: setProtocol.orders.generateExpirationTimestamp(180),
      feeRecipientAddress: SetProtocol.NULL_ADDRESS,
      makerAddress: zeroExMaker,
      makerAssetAmount: new BigNumber(fillQuantity.dividedBy(10**13).mul(4)),
      makerAssetData: assetDataUtils.encodeERC20AssetData(addresses.stably),
      makerFee: new BigNumber(0),
      salt: setProtocol.orders.generateSalt(),
      senderAddress: SetProtocol.NULL_ADDRESS,
      takerAddress: SetProtocol.NULL_ADDRESS,
      takerAssetAmount: new BigNumber(signedIssuanceOrder.makerTokenAmount.dividedBy(10).mul(4)),
      takerAssetData: assetDataUtils.encodeERC20AssetData(addresses.weth),
      takerFee: new BigNumber(0),
    };

    console.log(zeroExOrderStably)


    const zeroExOrderDai = {
      exchangeAddress: addresses.Exchange,
      expirationTimeSeconds: setProtocol.orders.generateExpirationTimestamp(180),
      feeRecipientAddress: SetProtocol.NULL_ADDRESS,
      makerAddress: zeroExMaker,
      makerAssetAmount: new BigNumber(fillQuantity.dividedBy(10).mul(3)),
      makerAssetData: assetDataUtils.encodeERC20AssetData(addresses.dai),
      makerFee: new BigNumber(0),
      salt: setProtocol.orders.generateSalt(),
      senderAddress: SetProtocol.NULL_ADDRESS,
      takerAddress: SetProtocol.NULL_ADDRESS,
      takerAssetAmount: new BigNumber(signedIssuanceOrder.makerTokenAmount.dividedBy(10).mul(3)),
      takerAssetData: assetDataUtils.encodeERC20AssetData(addresses.weth),
      takerFee: new BigNumber(0),
    };

    const trueUSDZeroExOrderHash = orderHashUtils.getOrderHashHex(zeroExOrderTrueUSD);


    const trueUSDZeroExOrderSig = await signatureUtils.ecSignOrderHashAsync(
      setProtocol.web3.currentProvider,
      trueUSDZeroExOrderHash,
      zeroExMaker,
      SignerType.Metamask,
      );
    const trueUSDSignedZeroExOrder = Object.assign(
      {},
      zeroExOrderTrueUSD,
      { signature: trueUSDZeroExOrderSig }
      );

    const daiZeroExOrderHash = orderHashUtils.getOrderHashHex(zeroExOrderDai);
    const daiZeroExOrderSig = await signatureUtils.ecSignOrderHashAsync(
      setProtocol.web3.currentProvider,
      daiZeroExOrderHash,
      zeroExMaker,
      SignerType.Metamask,
      );
    const daiSignedZeroExOrder = Object.assign(
      {},
      zeroExOrderDai,
      { signature: daiZeroExOrderSig }
      );

    const stablyZeroExOrderHash = orderHashUtils.getOrderHashHex(zeroExOrderStably);
    const stablyZeroExOrderSig = await signatureUtils.ecSignOrderHashAsync(
      setProtocol.web3.currentProvider,
      stablyZeroExOrderHash,
      zeroExMaker,
      SignerType.Metamask,
      );
    const stablySignedZeroExOrder = Object.assign(
      {},
      zeroExOrderStably,
      { signature: stablyZeroExOrderSig }
      );
    

    const zeroExSignedOrderTrueUSD = Object.assign(
      {},
      trueUSDSignedZeroExOrder,
      { fillAmount: trueUSDSignedZeroExOrder.takerAssetAmount },
      );

    const zeroExSignedOrderDai = Object.assign(
      {},
      daiSignedZeroExOrder,
      { fillAmount: daiSignedZeroExOrder.takerAssetAmount },
      );

    const zeroExSignedOrderStably = Object.assign(
      {},
      stablySignedZeroExOrder,
      { fillAmount: stablySignedZeroExOrder.takerAssetAmount },
      );

    const orders = [zeroExSignedOrderDai,zeroExSignedOrderTrueUSD,zeroExSignedOrderStably];

    const txOpts = {
      from: takerAddress,
      gas: 5000000,
      gasPrice: 8000000000,
    };

    try{
      await setProtocol.orders.validateOrderFillableOrThrowAsync(signedIssuanceOrder, signedIssuanceOrder.quantity);
      await setProtocol.orders.fillOrderAsync(
        signedIssuanceOrder,
        signedIssuanceOrder.quantity,
        orders,
        txOpts
        );
      await this.props.removeFilledOrExpiredOrder(orderObj.id)
    }
    catch(err){
      console.error(err)
    }
  }

  handleFillOrder = async (index) => {
    const {setProtocol, signedIssuanceOrders} = this.props
    const {account} = this.state
    const orderObj = signedIssuanceOrders.find(order => order.id === index)

    const signedIssuanceOrder = orderObj.signedIssuanceOrder

    const takerAddress = account
    const fillQuantity = signedIssuanceOrder.quantity;
    await setProtocol.orders.validateOrderFillableOrThrowAsync(signedIssuanceOrder, fillQuantity);
    const takerWalletOrder1 = {
      takerTokenAddress: addresses.dai,
      takerTokenAmount: new BigNumber(fillQuantity.mul(0.3)),
    }
    const takerWalletOrder2 = {
      takerTokenAddress: addresses.trueUsd,
      takerTokenAmount: new BigNumber(fillQuantity.mul(0.3)),
    }

    const takerWalletOrder3 = {
      takerTokenAddress: addresses.stably,
      takerTokenAmount: new BigNumber(fillQuantity.mul(4).div(10**13)),
    }

    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.dai, { from: takerAddress });
    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.trueUsd, { from: takerAddress });

    const orders = [takerWalletOrder1, takerWalletOrder2, takerWalletOrder3];
    const txOpts = {
      from: takerAddress,
      gas: 3000000,
      gasPrice: 8000000000
    };
    try{
      await setProtocol.orders.fillOrderAsync(
        signedIssuanceOrder,
        fillQuantity,
        orders,
        txOpts
      );
      await this.props.removeFilledOrExpiredOrder(orderObj.id)
    }
    catch(error){
      console.error(error)
    }
  }

  proposeDynamicStableSetRebalance = async () => {
    const {setProtocol} = this.props
    const {account, weightedStableSetAddress} = this.state
    // const weightedStableSetAddress = await this.handleCreateSetForRebalancing();

    const auctionLibrary = addresses.linearAuctionCurve;
    const numberAuctionPriceDivisor = 1000;
    const startPriceRatio = 0.90;
    const priceRatioStep = 0.005

    const curveCoefficient = new BigNumber(numberAuctionPriceDivisor*priceRatioStep);
    const auctionStartPrice = new BigNumber(startPriceRatio*numberAuctionPriceDivisor);
    const txOpts = {
      from: account,
      gas: 4000000,
      gasPrice: 8000000000,
    };
    const proposal = await setProtocol.rebalancing.proposeAsync(
      addresses.rebalancingStableSetAddress,   // rebalancingSetTokenAddress
      weightedStableSetAddress,  // nextSetAddress
      auctionLibrary,         // address of linear auction library
      curveCoefficient,
      auctionStartPrice,
      new BigNumber(numberAuctionPriceDivisor),
      txOpts,
    );
    console.log("Transaction processing")
    const mined = await setProtocol.awaitTransactionMinedAsync(proposal)
    console.log("Mined")

    if(mined){
      const details = await setProtocol.rebalancing.getProposalDetails(addresses.rebalancingStableSetAddress)
      console.log(details)
    }
  }

  rebalance = async () => {
    const {setProtocol} = this.props
    const {account} = this.state
    const txOpts = {
      from: account,
      gas: 4000000,
      gasPrice: 8000000000,
    };

    const txHash = await setProtocol.rebalancing.rebalanceAsync(
      addresses.rebalancingStableSetAddress,
      txOpts
      )

    const mined = await setProtocol.awaitTransactionMinedAsync(txHash)
    if(mined){
      console.log("entered rebalancing phase")
    }
  }

  settleRebalance = async () => {
    const { setProtocol } = this.props
    const {account} = this.state
    const txOpts = {
      from: account,
      gas: 4000000,
      gasPrice: 8000000000,
    };
    const txHash = await setProtocol.rebalancing.settleRebalanceAsync(
      addresses.rebalancingStableSetAddress,
      txOpts
      )
    const mined = await setProtocol.awaitTransactionMinedAsync(txHash)
    if(mined){
      console.log("Exiting rebalancing phase")
    }

  }

  getBidPrice = async() => {
    const { setProtocol } = this.props;
    const {bidQuantity} = this.state
    const rebalancingSetTokenAddress = addresses.rebalancingStableSetAddress;
    console.log("REBALANCING SET ADDRESS:", rebalancingSetTokenAddress);
    const quantity = new BigNumber(bidQuantity * 10**18);

    const txHash = await setProtocol.rebalancing.getBidPriceAsync(
      rebalancingSetTokenAddress,
      quantity
    );
    console.log("GETTING BID PRICE:", txHash);
    return txHash;
  }

  getRebalanceDetails = async() => {
    const {setProtocol} = this.props

    const result = await setProtocol.rebalancing.getRebalanceDetails(
      addresses.rebalancingStableSetAddress,
      )
    console.log(result)
  }

  bidOnRebalance = async () => {
    console.log("bidding on Rebalance..");
    const { setProtocol } = this.props;
    const {account, bidQuantity} = this.state
    const quantity = new BigNumber(bidQuantity * 10**18);
    const txOpts = {
      from: account,
      gas: 4000000,
      gasPrice: 8000000000
    };

    console.log("bidding....");

    const txHash = await setProtocol.rebalancing.bidAsync(
      addresses.rebalancingStableSetAddress,
      quantity,
      txOpts
    );
    console.log("BID. HASH: ", txHash);
    return txHash;
  }

  render() {  
    const {
      bidQuantity,
      stableSetQty,
      price,
      seconds,
      issueQty,
      redeemQty,
      loading,
      balance,
      rebalancingBalance,
      issueRebalancingQty,
      redeemRebalancingQty,
      proposedDAIRatio,
      proposedTUSDRatio,
      rebalancingSetSymbol,
      rebalancingSetName
    } = this.state
    const {
      signedIssuanceOrders
    } = this.props
    return (
      <Segment basic loading={loading}>
        <Grid padded>
          <Grid.Row>
            <Segment basic><Header as="h3">My Balance of STBL: {balance}</Header></Segment> 
          </Grid.Row>
          <Grid.Row>
            <Segment basic><Header as="h3">My Balance of Initial Rebalancing STBL: {rebalancingBalance}</Header></Segment> 
          </Grid.Row>
          <Grid.Row>
            <Form>
              <Form.Button onClick={this.approveEverything}>Approve Everything</Form.Button>
              <Header as="h3">StableSet Actions</Header>
              <Form.Button onClick={this.handleCreateSet}>Create New STBL Set</Form.Button>
              <Header as="h5">Issue StableSets</Header>
              <Form.Group>
                <Form.Input
                type="number"
                label='Input quantity STBL to issue' 
                value={issueQty}
                onChange={(e) => this.setState({issueQty: e.target.value})} 
                placeholder='100' 
                />
              </Form.Group>
              <Form.Button onClick={this.issueStableSet}>Submit</Form.Button>
              <Header as="h5">Redeem StableSets</Header>
              <Form.Group>
                <Form.Input
                type="number"
                label='Input quantity STBL to redeem for TUSD and DAI' 
                value={redeemQty}
                onChange={(e) => this.setState({redeemQty: e.target.value})} 
                placeholder='40' 
                />
              </Form.Group>
              <Form.Button onClick={this.redeemStableSet}>Submit</Form.Button>
              <Header as="h5">Buy STBL with Weth</Header>
              <Form.Group>
                <Form.Input
                label='Input quantity STBL to buy' 
                type="number"
                value={stableSetQty}
                onChange={(e) => this.setState({stableSetQty: e.target.value})} 
                placeholder='100' />
                <Form.Input
                label='Input Price in WETH/STBL' 
                type="number"
                value={price}
                onChange={(e) => this.setState({price: e.target.value})} 
                placeholder='.004' />
                <Form.Input
                label='Input expiration in seconds'
                type="number" 
                value={seconds}
                onChange={(e) => this.setState({seconds: e.target.value})} 
                placeholder='86400' />
              </Form.Group>
              <Form.Button onClick={this.createIssuanceOrderWethStableSet}>Submit on Set Protocol</Form.Button>
              <Header as="h5">All Set Issuance Orders</Header>
              {signedIssuanceOrders.length && signedIssuanceOrders.map((order,i) => (
                <Segment basic key={order.id}>
                  <div>{order.signedIssuanceOrder.quantity && order.signedIssuanceOrder.quantity.toString()}</div>
                  <div>{order.signedIssuanceOrder.expiration && order.signedIssuanceOrder.expiration.toString()}</div>
                  <div>{order.signedIssuanceOrder.makerTokenAmount && order.signedIssuanceOrder.makerTokenAmount.toString()}</div>
                  <div>{order.signedIssuanceOrder.makerAddress && order.signedIssuanceOrder.makerAddress}</div>
                  <Button onClick={() => this.handleFillOrder(order.id)}>Fill Order</Button>
                  <Button onClick={() => this.fillZeroExIssuanceOrderWethStableSet(order.id)}>Fill 0x Order</Button>
                </Segment>
                ))}
              <Divider />
              <Header as="h3">Rebalancing Functions</Header>
              <Form.Button onClick={this.createDynamicStableSet}>Create Rebalance Set</Form.Button>
              <Form.Group>
                <Form.Input
                type="number"
                label='Input quantity STBL to issue rebalancing DSTBL' 
                value={issueRebalancingQty}
                onChange={(e) => this.setState({issueRebalancingQty: e.target.value})} 
                placeholder='100' 
                />
              </Form.Group>
              <Form.Button onClick={this.issueRebalancingStableSet}>Submit</Form.Button>

              <Header as="h5">Redeem Rebalancing StableSet</Header>
              <Form.Group>
                <Form.Input
                type="number"
                label='Input quantity DSTBL to redeem for STBL' 
                value={redeemRebalancingQty}
                onChange={(e) => this.setState({redeemRebalancingQty: e.target.value})} 
                placeholder='40' 
                />
              </Form.Group>
              <Form.Button onClick={this.redeemRebalancingStableSet}>Submit</Form.Button>

              <Form.Group>
                <Form.Input
                type="text"
                label='Input New Name' 
                value={rebalancingSetName}
                onChange={(e) => this.setState({rebalancingSetName: e.target.value})} 
                placeholder='StableSet v5' 
                />
                <Form.Input
                type="text"
                label='Input New Symbol' 
                value={rebalancingSetSymbol}
                onChange={(e) => this.setState({rebalancingSetSymbol: e.target.value})} 
                placeholder='STBLV5' 
                />
                <Form.Input
                type="number"
                label='Input Proposed Rebalancing Percentage of TUSD' 
                value={proposedTUSDRatio}
                onChange={(e) => this.setState({proposedTUSDRatio: e.target.value})} 
                placeholder='0.4' 
                />
                <Form.Input
                type="number"
                label='Input Proposed Rebalancing Percentage of DAI' 
                value={proposedDAIRatio}
                onChange={(e) => this.setState({proposedDAIRatio: e.target.value})} 
                placeholder='0.6' 
                />
              </Form.Group>
              <Form.Button onClick={this.handleCreateSetForRebalancing}>1) Manager Create Proposal Set</Form.Button>
              <Form.Button onClick={this.proposeDynamicStableSetRebalance}>2) Start Proposal Phase</Form.Button>
              <Form.Button onClick={this.rebalance}>3) Start Rebalance Phase</Form.Button>
              <Form.Button onClick={this.getRebalanceDetails}>4a) Get Current Rebalancing Info</Form.Button>
              <Form.Group>
                <Form.Input
                type="number"
                label='Input quantity to get bid price and to bid' 
                value={bidQuantity}
                onChange={(e) => this.setState({bidQuantity: e.target.value})} 
                placeholder='40' 
                />
              </Form.Group>
              <Form.Button onClick={this.getBidPrice}>4b) Get Bid Price</Form.Button>
              <Form.Button onClick={this.bidOnRebalance}>4c) Bid On Rebalance</Form.Button>
              <Form.Button onClick={this.settleRebalance}>5) Settle Rebalance</Form.Button>
            </Form>
          </Grid.Row>
        </Grid>
      </Segment>
      
    )
  }
}

const mapStateToProps = state => {
  return {
    setProtocol: state.setProtocol,
    signedIssuanceOrders: state.signedIssuanceOrders
  }
}

const mapDispatchToProps = dispatch => {
  return {
    createNewOrder: (order) => {
      dispatch(createNewOrder(order))
    },
    removeFilledOrExpiredOrder: (orderId) => {
      dispatch(removeFilledOrExpiredOrder(orderId))
    }
  }
}

export default connect(mapStateToProps,mapDispatchToProps)(StableSetComponent)