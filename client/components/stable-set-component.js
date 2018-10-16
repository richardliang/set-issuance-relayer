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
      proposedTUSDRatio: 0.5,
      proposedDAIRatio: 0.5,
    }
  }

  async componentDidMount() {
    const {setProtocol} = this.props

    this.setState({
      loading: true
    })
    const details = await setProtocol.setToken.getDetails(addresses.stableSet)
    const setBalance = await setProtocol.erc20.getBalanceOfAsync(addresses.stableSet, setProtocol.web3.eth.accounts[0])
    const rebalancingSetBalance = await setProtocol.erc20.getBalanceOfAsync(addresses.rebalancingStableSetAddress, setProtocol.web3.eth.accounts[0])
    this.setState({
      balance: (setBalance.toNumber()/(10 ** 18)).toFixed(4),
      rebalancingBalance: (rebalancingSetBalance.toNumber()/(10**18)).toFixed(4),
      details: details,
      loading: false
    })
  }

  handleCreateSet = async () => {
    const {setProtocol} = this.props

    const componentAddresses = [addresses.dai, addresses.trueUsd];
    const componentUnits = [new BigNumber(5), new BigNumber(5)];
    const naturalUnit = new BigNumber(10);
    const name = 'Stable Set';
    const symbol = 'STBL';

    const txOpts = {
      from: setProtocol.web3.eth.accounts[0],
      gas: 4000000,
      gasPrice: 8000000000,
    };

    const txHash = await setProtocol.createSetAsync(
      componentAddresses,
      componentUnits,
      naturalUnit,
      name,
      symbol,
      txOpts,
      );

    let setAddress =  await setProtocol.getSetAddressFromCreateTxHashAsync(txHash);
    console.log("StableSet Address: ", setAddress)
  }

  handleCreateSetForRebalancing = async () => {
    const { setProtocol } = this.props;

    const componentAddresses = [addresses.dai, addresses.trueUsd];
    const componentUnits = [new BigNumber(7), new BigNumber(3)];
    const naturalUnit = new BigNumber(10);
    const name = "Stable Set v2";
    const symbol = "STBLv2";
    const txOpts = {
      from: setProtocol.web3.eth.accounts[0],
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

    const set2Address = await setProtocol.getSetAddressFromCreateTxHashAsync(
      txHash
    );

    console.log(set2Address);
    return set2Address
  }

  createDynamicStableSet = async () => {
    const {setProtocol} = this.props
    const manager = setProtocol.web3.eth.accounts[0];      // Make yourself the manager!
    const initialSet = addresses.stableSet;
    const unitShares = new BigNumber(10**10); 

    const TWO_MIN = 60*2;
    const ONE_MIN = 60; // Assuming 30 days in a month

    const proposalPeriod = new BigNumber(TWO_MIN);
    // In order to rebalance every quarter we must allow for the one week proposal period
    const rebalanceInterval = new BigNumber(TWO_MIN - ONE_MIN)

    const name = 'Dynamic StableSet Rebalance';
    const symbol = 'DSTBL';
    const txOpts = {
      from: setProtocol.web3.eth.accounts[0],
      gas: 4000000,
      gasPrice: 8000000000,
    };
    const txHash = await setProtocol.createRebalancingSetTokenAsync(
      manager,
      initialSet,
      unitShares,
      proposalPeriod,
      rebalanceInterval,
      name,
      symbol,
      txOpts,
      );
    const rebalanceAddress = await setProtocol.getSetAddressFromCreateTxHashAsync(txHash);
    console.log("Rebalancing Set Address: ", rebalanceAddress)
    return rebalanceAddress
  };

  issueRebalancingStableSet = async () => {
    const {setProtocol} = this.props
    const {issueRebalancingQty} = this.state
    const issueQuantity = new BigNumber(new BigNumber(10 ** 18).mul(issueRebalancingQty));
    console.log(issueQuantity)
    const isMultipleOfNaturalUnit = await setProtocol.setToken.isMultipleOfNaturalUnitAsync(addresses.rebalancingStableSetAddress, issueQuantity);
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.rebalancingStableSetAddress, { from: setProtocol.web3.eth.accounts[0] });
    if (isMultipleOfNaturalUnit) {
      try {
        await setProtocol.issueAsync(
          addresses.rebalancingStableSetAddress,
          issueQuantity,
          {
            from: setProtocol.web3.eth.accounts[0],
            gas: 2000000,
            gasPrice: 8000000000,
          },
        );
      } catch (err) {
        console.error(`Error when issuing a new Set token: ${err}`)
      }
    }
    console.error(`Issue quantity is not multiple of natural unit. Confirm that your issue quantity is divisible by the natural unit.`);
  };

  issueStableSet = async () => {
    const {setProtocol} = this.props
    const {issueQty} = this.state
    const issueQuantity = new BigNumber(new BigNumber(10 ** 18).mul(issueQty));

    const isMultipleOfNaturalUnit = await setProtocol.setToken.isMultipleOfNaturalUnitAsync(addresses.stableSet, issueQuantity);
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.stableSet, { from: setProtocol.web3.eth.accounts[0] });
    if (isMultipleOfNaturalUnit) {
      try {
        await setProtocol.issueAsync(
          addresses.stableSet,
          issueQuantity,
          {
            from: setProtocol.web3.eth.accounts[0],
            gas: 2000000,
            gasPrice: 8000000000,
          },
        );
      } catch (err) {
        console.error(`Error when issuing a new Set token: ${err}`)
      }
    }
    console.error(`Issue quantity is not multiple of natural unit. Confirm that your issue quantity is divisible by the natural unit.`);
  };

  redeemStableSet = async () => {
    const {setProtocol} = this.props
    const {redeemQty} = this.state

    const quantity = new BigNumber(new BigNumber(10 ** 18).mul(redeemQty));
    const withdraw = true;
    const tokensToExclude = [];
    const txOpts = {
      from: setProtocol.web3.eth.accounts[0],
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

    console.log(txHash)
  };

  createIssuanceOrderWethStableSet = async () => {
    const {setProtocol} = this.props
    const {stableSetQty, price, seconds, details} = this.state
    const [makerAddress] = setProtocol.web3.eth.accounts

    const wethQty = Math.floor(stableSetQty*price*1000000)/1000000

    const quantity = new BigNumber(new BigNumber(10**18).mul(stableSetQty))

    const requiredComponents = details.components.map(component => component.address);

    const requiredComponentAmounts = details.components.map(component => new BigNumber(new BigNumber(10**17).mul(component.unit).mul(stableSetQty)))

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

    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(
    //   makerToken,
    //   txOpts
    // )

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

    const zeroExMaker = setProtocol.web3.eth.accounts[0];

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

  createZeroExIssuanceOrderWethStableSet = async (index) => {
    const {setProtocol,signedIssuanceOrders} = this.props
    const {details} = this.state

    const orderObj = signedIssuanceOrders.find(order => order.id === index)
    const signedIssuanceOrder = orderObj.signedIssuanceOrder

    const zeroExMaker = setProtocol.web3.eth.accounts[0];
    const takerAddress = setProtocol.web3.eth.accounts[0]

    console.log(setProtocol.web3.currentProvider)

    await this.check0xAllowance(index);

    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.trueUsd, { from: takerAddress });
    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.dai, { from: takerAddress });
    const fillQuantity = signedIssuanceOrder.quantity

    const zeroExOrderTrueUSD = {
      exchangeAddress: addresses.Exchange,
      expirationTimeSeconds: setProtocol.orders.generateExpirationTimestamp(180),
      feeRecipientAddress: SetProtocol.NULL_ADDRESS,
      makerAddress: zeroExMaker,
      makerAssetAmount: new BigNumber(fillQuantity.dividedBy(2)),
      makerAssetData: assetDataUtils.encodeERC20AssetData(addresses.trueUsd),
      makerFee: new BigNumber(0),
      salt: setProtocol.orders.generateSalt(),
      senderAddress: SetProtocol.NULL_ADDRESS,
      takerAddress: SetProtocol.NULL_ADDRESS,
      takerAssetAmount: new BigNumber(signedIssuanceOrder.makerTokenAmount.dividedBy(2)),
      takerAssetData: assetDataUtils.encodeERC20AssetData(addresses.weth),
      takerFee: new BigNumber(0),
    };


    const zeroExOrderDai = {
      exchangeAddress: addresses.Exchange,
      expirationTimeSeconds: setProtocol.orders.generateExpirationTimestamp(180),
      feeRecipientAddress: SetProtocol.NULL_ADDRESS,
      makerAddress: zeroExMaker,
      makerAssetAmount: new BigNumber(fillQuantity.dividedBy(2)),
      makerAssetData: assetDataUtils.encodeERC20AssetData(addresses.dai),
      makerFee: new BigNumber(0),
      salt: setProtocol.orders.generateSalt(),
      senderAddress: SetProtocol.NULL_ADDRESS,
      takerAddress: SetProtocol.NULL_ADDRESS,
      takerAssetAmount: new BigNumber(signedIssuanceOrder.makerTokenAmount.dividedBy(2)),
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
    
    console.log(trueUSDSignedZeroExOrder,daiSignedZeroExOrder)

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

    const orders = [zeroExSignedOrderDai,zeroExSignedOrderTrueUSD];

    const txOpts = {
      from: takerAddress,
      gas: 5000000,
      gasPrice: 8000000000,
    };

    console.log(zeroExSignedOrderDai, zeroExSignedOrderTrueUSD)
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
    const orderObj = signedIssuanceOrders.find(order => order.id === index)

    const signedIssuanceOrder = orderObj.signedIssuanceOrder

    const [takerAddress] = setProtocol.web3.eth.accounts
    const fillQuantity = signedIssuanceOrder.quantity;
    await setProtocol.orders.validateOrderFillableOrThrowAsync(signedIssuanceOrder, fillQuantity);
    const takerWalletOrder1 = {
      takerTokenAddress: addresses.dai,
      takerTokenAmount: new BigNumber(fillQuantity.dividedBy(2)),
    }
    const takerWalletOrder2 = {
      takerTokenAddress: addresses.trueUsd,
      takerTokenAmount: new BigNumber(fillQuantity.dividedBy(2)),
    }

    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.dai, { from: takerAddress });
    // await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.trueUsd, { from: takerAddress });

    const orders = [takerWalletOrder1, takerWalletOrder2];
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

    const weightedStableSetAddress = await this.handleCreateSetForRebalancing();

    const auctionLibrary = addresses.linearAuctionCurve;
    const numberAuctionPriceDivisor = 1000;
    const startPriceRatio = 0.90;
    const priceRatioStep = 0.005

    const curveCoefficient = new BigNumber(numberAuctionPriceDivisor*priceRatioStep);
    const auctionStartPrice = new BigNumber(startPriceRatio*numberAuctionPriceDivisor);
    const txOpts = {
      from: setProtocol.web3.eth.accounts[0],
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

    console.log(proposal)

  }

  getBidPrice = async() => {
    const { setProtocol } = this.props;
    const rebalancingSetTokenAddress = addresses.rebalancingStableSetAddress;
    console.log("REBALANCING SET ADDRESS:", rebalancingSetTokenAddress);
    const bidQuantity = new BigNumber(10 ** 18);

    const txHash = await setProtocol.rebalancing.getBidPriceAsync(
      rebalancingSetTokenAddress,
      bidQuantity
    );
    console.log("GETTING BID PRICE:", txHash);
    return txHash;
  }

  render() {  
    const {
      stableSetQty,
      price,
      seconds,
      issueQty,
      redeemQty,
      loading,
      balance,
      rebalancingBalance,
      issueRebalancingQty,
      proposedDAIRatio,
      proposedTUSDRatio
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
              <Header as="h3">StableSet Actions</Header>
              <Header as="h5">Issue StableSets</Header>
              <Form.Button onClick={this.handleCreateSet}>Create New STBL Set</Form.Button>
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
                  <Button onClick={() => this.createZeroExIssuanceOrderWethStableSet(order.id)}>Fill 0x Order</Button>
                </Segment>
                ))}
              <Divider />
              <Header as="h3">Rebalancing Functions</Header>
              <Form.Button onClick={this.createDynamicStableSet}>Create Rebalance Set</Form.Button>
              <Form.Group>
                <Form.Input
                type="number"
                label='Input quantity STBL to issue rebalance' 
                value={issueRebalancingQty}
                onChange={(e) => this.setState({issueRebalancingQty: e.target.value})} 
                placeholder='100' 
                />
              </Form.Group>
              <Form.Button onClick={this.issueRebalancingStableSet}>Submit</Form.Button>
              <Form.Group>
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
              <Form.Button onClick={this.proposeDynamicStableSetRebalance}>Submit</Form.Button>
              <Form.Button onClick={this.getBidPrice}>Get Bid Price</Form.Button>
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