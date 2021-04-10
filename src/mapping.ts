import { BigInt, Address, store } from '@graphprotocol/graph-ts';
import { Transfer, ERC20 } from '../generated/Balancer/ERC20';
import { Token, Holder } from '../generated/schema';

function updateBalance(token: Token, holderAddress: Address, value: BigInt, increase: boolean): void {
  if (holderAddress.toHexString() == '0x0000000000000000000000000000000000000000') {
    if (increase) {
      token.burned = token.burned.plus(value);
      token.save();
    }
    return;
  }
  let tokenAddress = token.address;
  let id = tokenAddress.toHex() + '-' + holderAddress.toHex();
  let holder = Holder.load(id);
  if (holder == null) {
    holder = new Holder(id);
    holder.address = holderAddress;
    holder.balance = BigInt.fromI32(0);
    holder.token = tokenAddress.toHex();
    token.holders = token.holders.plus(BigInt.fromI32(1));
  }
  holder.balance = increase ? holder.balance.plus(value) : holder.balance.minus(value);
  if (holder.balance.le(BigInt.fromI32(0))) {
    store.remove('Holder', id);
    token.holders = token.holders.minus(BigInt.fromI32(1));
  } else {
    holder.save();
  }
  token.save();
}

function updateTotalSupply(address: Address): Token {
  let contract = ERC20.bind(address);
  let token = Token.load(address.toHex());
  if (token == null) {
    token = new Token(address.toHex());
    token.address = address;
    token.totalSupply = BigInt.fromI32(0);
    token.holders = BigInt.fromI32(0);
    token.burned = BigInt.fromI32(0);
  }
  token.totalSupply = contract.totalSupply();
  token.save();
  return token!!;
}

export function handleTransfer(event: Transfer): void {
  let token = updateTotalSupply(event.address);
  updateBalance(token, event.params.from, event.params.value, false);
  updateBalance(token, event.params.to, event.params.value, true);
}
