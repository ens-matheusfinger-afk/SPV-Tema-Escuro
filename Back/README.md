## npm
```
npm init                # cria package.json com perguntas interativas
npm init -y              # cria package.json com valores padrão, sem perguntas
npm install <pacote>      # instala um pacote e salva em dependencies
npm test                 # roda os testes configurados no package.json
```

## Git - Configuração inicial (uma vez só)
```
git config --global user.name "Seu Nome"
git config --global user.email "seuemail@exemplo.com"
```

## Git - Criar/clonar repositório
```
git init                 # cria repositório novo na pasta atual (gera a pasta .git)
git clone <url>           # clona um repositório existente
```

## Git - Status e diferenças
```
git status                # mostra arquivos modificados/novos/staged
git diff                  # mostra alterações linha a linha
```

## Git - Adicionar e commitar
```
git add arquivo.js        # adiciona um arquivo específico
git add .                 # adiciona todos os arquivos modificados
git commit -m "mensagem"  # cria o commit
git commit -am "mensagem" # add + commit (só arquivos já rastreados)
```

## Git - Histórico
```
git log                   # histórico completo
git log --oneline          # histórico resumido
```

## Git - Branches
```
git branch                       # lista branches
git branch nome-da-branch         # cria uma branch
git checkout nome-da-branch        # troca de branch
git checkout -b nome-da-branch     # cria e já troca
```

## Git - Repositório remoto (GitHub)
```
git remote -v                                    # verifica se está linkado a um remoto
git remote add origin <url>                        # conecta a um repositório remoto
git remote set-url origin <url>                     # troca a URL do remoto já existente
git push -u origin main                             # envia commits e fixa a branch padrão
git pull origin main                                # traz atualizações do remoto
```

## Git - Desfazer coisas
```
git restore arquivo.js     # descarta alterações não commitadas
git reset HEAD~1           # desfaz o último commit (mantém as alterações)
```

## Fluxo básico do dia a dia
```
npm test
git add .
git commit -m "mensagem descrevendo a alteração"
git push
