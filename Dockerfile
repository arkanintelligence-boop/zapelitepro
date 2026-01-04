# Usar a imagem leve do Nginx para servir conteúdo estático
FROM nginx:alpine

# Copiar os arquivos do site para o diretório padrão do Nginx
COPY . /usr/share/nginx/html

# Expor a porta 80
EXPOSE 80

# O Nginx inicia automaticamente, então não precisamos de um CMD customizado
