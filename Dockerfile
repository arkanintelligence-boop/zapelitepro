# Usar a imagem leve do Nginx para servir conteúdo estático
FROM nginx:alpine

# Copiar apenas os arquivos da pasta 'site' para o diretório de serviço
COPY ./site /usr/share/nginx/html

# Expor a porta 80
EXPOSE 80
