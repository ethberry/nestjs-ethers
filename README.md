# NestJS Ethers Transport

### Private test blockchain

To setup Besu

```sh
docker run -p 8546:8546 -p 8545:8545 --mount type=bind,source=$PWD/besu,target=/var/lib/besu hyperledger/besu:latest --miner-enabled --miner-coinbase fe3b557e8fb62b89f4916b721be55ceb828dbd73 --rpc-ws-enabled --rpc-http-enabled --rpc-http-cors-origins=all --network=dev --data-path=/var/lib/besu
```

Explorer (port 8080)
```shell
docker run -p 8080:80 -e APP_NODE_URL=http://localhost:8545 alethio/ethereum-lite-explorer
```
