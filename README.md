# @rafahgm/builder

Gera o bundle de vários arquivos utilizando Webpack e Babel (um bundle para cada arquivo)

## Uso
```builder --entrada "src/**/*.js" --saida "dest/"```

## Comportamento de acordo com o NODE_ENV
### NODE_ENV=production
Não gera source maps, mas minifica o bundle

### NODE_ENV=development
Gera source maps e não minifica o bundle para acelerar o build. Atualiza o bundle ao alterar os arquivos.