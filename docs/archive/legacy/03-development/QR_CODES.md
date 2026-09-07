# QR Codes das mesas

Os QR Codes identificam somente a mesa física. Eles não representam cliente, pedido, conta ou sessão.

## Teste em rede local

1. No Windows, execute `ipconfig` e localize o endereço IPv4 do adaptador Wi-Fi em uso.
2. Em `.env.local`, configure `NEXT_PUBLIC_APP_URL=http://<SEU-IPV4>:3000`, sem assumir um IP fixo.
3. Inicie o Next.js aceitando conexões da rede: `npm run dev -- --hostname 0.0.0.0`.
4. Gere os arquivos com `npm run generate:qrcodes`.
5. Escaneie `public/qrcodes/mesa-01.svg` pelo celular e confirme a abertura de `/mesa/1`.
6. Computador e celular precisam estar conectados à mesma rede Wi-Fi.

Antes da impressão definitiva, substitua a URL local pela URL HTTPS oficial e gere novamente os 23 arquivos.
