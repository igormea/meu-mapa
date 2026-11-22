# Ficha da Play Store — Ranvus Maps

## Dados do app
- **Nome:** Ranvus Maps
- **Pacote:** io.github.igormea.meumapa
- **Categoria:** Mapas e navegação (alternativa: Jogos › RPG)
- **Contato:** WhatsApp (85) 99766-2543 · e-mail da conta do Play Console
- **Política de privacidade:** https://igormea.github.io/meu-mapa/privacidade.html
- **Exclusão de conta (link web):** https://igormea.github.io/meu-mapa/privacidade.html#excluir
- **Anúncios:** não · **Compras no app:** não · **Preço:** grátis

## Descrição curta (até 80 caracteres)
Navegue como no Waze enquanto seu herói luta, evolui e conquista sozinho.

## Descrição completa
Ranvus Maps é um app de navegação com alma de RPG. Você só coloca o destino e dirige normalmente — o seu herói faz o resto.

🗺️ NAVEGAÇÃO DE VERDADE
• Rotas de carro, a pé e de bike, com instruções de voz
• Alertas de radar e lombada, velocímetro e chegada estimada
• Busca rápida de endereços e Portais (seus lugares favoritos)
• Compartilhe sua rota por link, como no Uber, para quem você quiser

⚔️ RPG SEM TOCAR NA TELA
• Escolha entre 5 classes: Cavaleiro, Mago, Arqueiro, Bárbaro e Ladino
• Monstros 3D aparecem pelo caminho e seu herói luta automaticamente
• Ganhe XP, ouro e itens; equipamentos são trocados sozinhos
• Passe por postos e farmácias e o herói compra poções e vende o que não presta
• Bestiário com 139 monstros: cada bairro, praia, lagoa e zona industrial tem os seus
• Chefes, pergaminhos, conquistas, reinos e estatísticas da sua estrada

👥 COM OS AMIGOS
• Apelido, companheiros e guildas de até 8 pessoas
• Chefes de guilda: cada km que qualquer membro dirige é um golpe
• Ranking semanal, troca de itens e localização ao vivo pra guilda (você liga e desliga)
• Save na nuvem com sua conta Google

Feito para o motorista: nada exige toque enquanto você dirige. Respeite sempre as leis de trânsito.

## Imagens
- Ícone 512×512: `store/icon-play-512.png`
- Banner de destaque 1024×500: `store/feature-1024x500.png`
- Capturas de tela (celular, 1080×1920): `store/screens/01…07`

## Classificação de conteúdo (questionário)
- Violência: fantasia/desenho, sem sangue (monstros caricatos) → resposta "violência fantasiosa leve"
- Interação entre usuários: sim (amigos, guilda, troca de itens); sem chat livre
- Compartilha localização com outros usuários: sim (opcional, controlado pelo usuário)
- Sem conteúdo sexual, drogas, apostas, linguagem imprópria

## Segurança de dados (Data safety)
**Coleta dados?** Sim. **Compartilha com terceiros?** Não (provedores de serviço não contam como "compartilhar"). **Criptografia em trânsito:** sim (HTTPS). **Usuário pode pedir exclusão:** sim (no app e pelo link).

| Tipo | Coletado | Obrigatório? | Finalidade |
|---|---|---|---|
| Localização precisa | Sim | Opcional (o app funciona sem enviar; envio só ao compartilhar) | Funcionalidade do app |
| Nome, e-mail (conta Google) | Sim | Opcional (login) | Gerenciamento de conta |
| ID do usuário | Sim | Opcional (login) | Gerenciamento de conta, funcionalidade |
| Atividade no app (progresso do jogo, km, conquistas) | Sim | Opcional (save na nuvem) | Funcionalidade do app |
| Fotos (foto do perfil Google) | Sim | Opcional | Gerenciamento de conta |
| Diagnóstico: registros de falhas | Sim | Automático (sem dados pessoais) | Análise / correção de erros |
| Áudio (busca por voz) | Não (processado pelo Android, o app recebe só texto) | — | — |

## Serviço em primeiro plano de localização (declaração FOREGROUND_SERVICE_LOCATION)
O app NÃO pede a permissão de localização em segundo plano (ACCESS_BACKGROUND_LOCATION). Ele usa um serviço em primeiro plano, com notificação visível, só durante a navegação. A Play pede uma declaração desse serviço:
**Recurso:** navegação passo a passo com instruções de voz.
**Justificativa:** durante uma navegação ativa, o app precisa da localização com a tela desligada ou com outro app em primeiro plano (ex.: música) para continuar dando as instruções de voz, os alertas de radar e para recalcular a rota. O uso para assim que a navegação termina. Uma notificação permanente aparece enquanto a localização está em uso.
**Vídeo:** gravar a tela mostrando: escolher destino → Partir → bloquear a tela → a voz continua dando as instruções.
