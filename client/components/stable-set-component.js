import React, { Component } from 'react'
import {connect} from 'react-redux'
import { Grid, Form, Button, Segment, Header, Popup, Icon } from 'semantic-ui-react'
import addresses from '../addresses'
import BigNumber from 'bignumber.js'
import SetProtocol, {SignedIssuanceOrder} from 'setprotocol.js'
import {createNewOrder, removeFilledOrExpiredOrder} from '../store'
import { assetDataUtils, orderHashUtils, signatureUtils } from '0x.js';
import { Order, SignedOrder, SignerType } from '@0xproject/types';

class StableSetComponent extends Component {
  constructor(props){
    super(props)

    this.state = {
      loading: false,
      stableSetQty: 0,
      price: 0,
      seconds: 0,
      issueQty: 0,
      redeemQty: 0,
      balance: 0,
    }
  }

  async componentDidMount() {
    const {setProtocol} = this.props

    const details = await setProtocol.setToken.getDetails(addresses.stableSet)
    const setBalance = await setProtocol.erc20.getBalanceOfAsync(addresses.stableSet, setProtocol.web3.eth.accounts[0])
    console.log(details, setBalance)

    this.setState({
      balance: (setBalance.toNumber()/(10 ** 18)).toFixed(4)
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

  issueStableSet = async () => {
    const {setProtocol} = this.props
    const {issueQty} = this.state

    const issueQuantity = new BigNumber(issueQty*10 ** 18);

    const isMultipleOfNaturalUnit = await setProtocol.setToken.isMultipleOfNaturalUnitAsync(addresses.stableSet, issueQuantity);
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.stableSet, { from: setProtocol.web3.eth.accounts[0] });
    if (isMultipleOfNaturalUnit) {
      try {
        await setProtocol.issueAsync(
          addresses.stableSet,
          issueQuantity,
          {
            from: setProtocol.web3.eth.accounts[0],
            gas: 4000000,
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

    const quantity = new BigNumber(redeemQty * 10 ** 18);
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
    const {stableSetQty, price, seconds} = this.state
    const [makerAddress] = setProtocol.web3.eth.accounts

    const wethQty = Math.floor(stableSetQty*price*1000000)/1000000

    const quantity = new BigNumber(stableSetQty * 10**18); //100sets

    const requiredComponents = [addresses.dai, addresses.trueUsd];

    // const requiredComponentAmounts = (await setProtocol.orders.calculateRequiredComponentsAndUnitsAsync(
    //   addresses.stableSet,
    //   makerAddress,
    //   quantity
    // )).units;

    const requiredComponentAmounts = [
      new BigNumber(stableSetQty * 10**17 * 5),
      new BigNumber(stableSetQty * 10**17 * 5),
    ];

    const makerToken = addresses.weth;
    const makerTokenAmount = new BigNumber(wethQty * 10**18);
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

    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(
      makerToken,
      txOpts
    )

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
    // console.log(signedIssuanceOrder, JSONOrder)
  }

  createZeroExIssuanceOrderWethStableSet = async (index) => {
    const {setProtocol,signedIssuanceOrders} = this.props
    const signedIssuanceOrder = signedIssuanceOrders[index].signedIssuanceOrder

    const zeroExMaker = setProtocol.web3.eth.accounts[0];
    const takerAddress = setProtocol.web3.eth.accounts[0]

    // console.log(setProtocol.web3.currentProvider)
    await setProtocol.erc20.approveAsync(
      addresses.trueUsd,
      addresses.ERC20Proxy,
      new BigNumber(5000000000000000000), // .5 units of trueUSD
      { from: zeroExMaker },
    );

    await setProtocol.erc20.approveAsync(
      addresses.dai,
      addresses.ERC20Proxy,
      new BigNumber(5000000000000000000), // .5 units of Dai
      { from: zeroExMaker },
    );

    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.trueUsd, { from: takerAddress });
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.dai, { from: takerAddress });

    const zeroExOrderTrueUSD = {
      exchangeAddress: addresses.Exchange,
      expirationTimeSeconds: setProtocol.orders.generateExpirationTimestamp(86400),
      feeRecipientAddress: SetProtocol.NULL_ADDRESS,
      makerAddress: zeroExMaker,
      makerAssetAmount: new BigNumber(500000000000000000),
      makerAssetData: assetDataUtils.encodeERC20AssetData(addresses.trueUsd),
      makerFee: new BigNumber(0),
      salt: setProtocol.orders.generateSalt(),
      senderAddress: SetProtocol.NULL_ADDRESS,
      takerAddress: SetProtocol.NULL_ADDRESS,
      takerAssetAmount: new BigNumber(1700000000000000),
      takerAssetData: assetDataUtils.encodeERC20AssetData(addresses.weth),
      takerFee: new BigNumber(0),
    };

    const zeroExOrderDai = {
      exchangeAddress: addresses.Exchange,
      expirationTimeSeconds: setProtocol.orders.generateExpirationTimestamp(86400),
      feeRecipientAddress: SetProtocol.NULL_ADDRESS,
      makerAddress: zeroExMaker,
      makerAssetAmount: new BigNumber(500000000000000000),
      makerAssetData: assetDataUtils.encodeERC20AssetData(addresses.dai),
      makerFee: new BigNumber(0),
      salt: setProtocol.orders.generateSalt(),
      senderAddress: SetProtocol.NULL_ADDRESS,
      takerAddress: SetProtocol.NULL_ADDRESS,
      takerAssetAmount: new BigNumber(1700000000000000),
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
    await setProtocol.orders.validateOrderFillableOrThrowAsync(signedIssuanceOrder, signedIssuanceOrder.quantity);
    await setProtocol.orders.fillOrderAsync(
      signedIssuanceOrder,
      signedIssuanceOrder.quantity,
      orders,
      txOpts
      );
  }

  handleFillOrder = async (index) => {
    const {setProtocol, signedIssuanceOrders} = this.props

    const signedIssuanceOrder = signedIssuanceOrders[index].signedIssuanceOrder

    const [takerAddress] = setProtocol.web3.eth.accounts
    console.log(takerAddress)
    const fillQuantity = signedIssuanceOrder.quantity;
    console.log(fillQuantity, signedIssuanceOrders)
    await setProtocol.orders.validateOrderFillableOrThrowAsync(signedIssuanceOrder, fillQuantity);
    const takerWalletOrder1 = {
      takerTokenAddress: addresses.dai,
      takerTokenAmount: new BigNumber(fillQuantity.dividedBy(2)),
    }
    const takerWalletOrder2 = {
      takerTokenAddress: addresses.trueUsd,
      takerTokenAmount: new BigNumber(fillQuantity.dividedBy(2)),
    }

    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.dai, { from: takerAddress });
    await setProtocol.setUnlimitedTransferProxyAllowanceAsync(addresses.trueUsd, { from: takerAddress });

    const orders = [takerWalletOrder1, takerWalletOrder2];
    const txOpts = {
      from: takerAddress,
      gas: 6712390,
      gasPrice: 8000000000
    };
    console.log(orders, signedIssuanceOrder)
    try{
      await setProtocol.orders.fillOrderAsync(
        signedIssuanceOrder,
        fillQuantity,
        orders,
        txOpts
      );
      // this.props.removeFilledOrExpiredOrder(signedIssuanceOrder.id)
    }
    catch(error){
      console.error(error)
    }
  }


  render() {  
    const {
      stableSetQty,
      price,
      seconds,
      issueQty,
      redeemQty,
      loading,
      balance
    } = this.state
    const {
      signedIssuanceOrders
    } = this.props
    return (
      <Segment basic>
        <Grid padded>
          <Grid.Row>
            <Segment basic><Header as="h3">My Balance of STBL: {balance}</Header></Segment> 
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
                  <Button onClick={() => this.handleFillOrder(i)}>Fill Order</Button>
                  <Button onClick={() => this.createZeroExIssuanceOrderWethStableSet(i)}>Fill 0x Order</Button>
                </Segment>
                ))}

              <Header as="h5">All 0x Orders</Header>

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