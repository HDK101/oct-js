# OCT-JS
Versão JS do OpenCode Theme, com poucas ou nenhuma dependências de pacotes. Tendo apenas o Jest no como dependência de desenvolvimento

# Instalação
`````
npm install -G oct-js
`````

# Uso
`````
COMANDOS:
  oct upload:
    oct upload ARQUIVO  #Manda o arquivo pro servidor
    oct upload --c  #Deleta todos os arquivos do tema no servidor e faz upload dos que estão na pasta 
  oct download #Faz download de todos os arquivos do tema
  oct watch #Assiste a pasta do tema e manda para o servidos as mudanças feitas
  oct remove ARQUIVO #Deleta o arquivo tanto localmente quanto no servidor
  oct new CHAVE(KEY) SENHA(PASSWORD) NOME_DO_TEMA #Cria um novo tema
  oct delete CHAVE(KEY) SENHA(PASSWORD) ID_DO_TEMA  #Deleta um tema
  oct configure CHAVE(KEY) SENHA(PASSWORD) ID_DO_TEMA  #Baixa a configuração do tema
  oct list:
    oct list CHAVE(KEY) SENHA(PASSWORD) #Lista todos os temas
    oct list #Lista todos os temas usando a chave e a senha da configuração localizada na pasta

`````

# Desenvolvimento

## Setup

Rode install para instalar as dependências(apesar de uma no desenvolvimento, até agora)
`````
npm install
`````

## Testes

Os testes estão localizado dentro da pasta \_\_tests\_\_

`````
npm run test
`````

# Scripts customizados
Na pasta do tema, após crie um arquivo chamado oct.watch.js

`````
module.exports = [
	{
		// Extensões de arquivos
		ext: /(.scss)|(.sass)/,
		// Pasta que se sofrer alteração, chama as funções
		folder: "/scss",
		// Executa depois
		postCallback: (file, pathFolder, mainPath) => {},
		// Executa antes
		preCallback: (file, pathFolder, mainPath) => {},
	}
]
`````

# Problemas
- Requisições relacionados a deleção retornam código HTTP 400, apesar de realizar a deleção
- Instalação de componentes não implementado
