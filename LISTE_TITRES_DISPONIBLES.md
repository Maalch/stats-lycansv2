# Liste des Titres Disponibles

*Exporté le 28 janvier 2026*

Cette liste contient tous les titres disponibles dans le système de titres des joueurs, triés par priorité décroissante.

---

## 📊 Statistiques Globales

- **Titres combinés** : 66 titres
- **Titres simples** : 65 titres (non prioritaires)
- **Total** : 131 titres

---

## 🏆 Titres Combinés (par priorité décroissante)

### Priorité 20 ⭐⭐⭐⭐⭐

#### 🏅 La Légende
- **Description** : Gagne tout le temps + grosses séries
- **Conditions** :
  - `winRate` : EXTREME_HIGH
  - `winSeries` : HIGH
- **Priorité** : 20

#### 🌧️ Le·a Poissard·e
- **Description** : Perd tout le temps + grosses séries de défaites
- **Conditions** :
  - `winRate` : EXTREME_LOW
  - `lossSeries` : HIGH
- **Priorité** : 20

---

### Priorité 19 ⭐⭐⭐⭐

#### 💎 Le·a Joueur·se Parfait·e
- **Description** : Gagne, récolte, et survit
- **Conditions** :
  - `winRate` : HIGH (min: ABOVE_AVERAGE)
  - `loot` : HIGH (min: ABOVE_AVERAGE)
  - `survival` : HIGH (min: ABOVE_AVERAGE)
- **Priorité** : 19

#### 🆘 Le·a Débutant·e
- **Description** : Peine en victoire, survie et récolte
- **Conditions** :
  - `winRate` : LOW
  - `survival` : LOW
  - `loot` : LOW
- **Priorité** : 19

---

### Priorité 18 ⭐⭐⭐

#### 🤖 Le·a Robot
- **Description** : Productif·ve, survit, parle peu
- **Conditions** :
  - `loot` : HIGH
  - `survival` : HIGH
  - `talking` : LOW
- **Priorité** : 18

#### 🎪 Le·a Pitre
- **Description** : Bavard·e, improductif·ve, meurt souvent
- **Conditions** :
  - `talking` : HIGH
  - `loot` : LOW
  - `survival` : LOW
- **Priorité** : 18

---

### Priorité 17 ⭐⭐⭐

#### 📻 Le·a Commentateur·rice
- **Description** : Ne fait que parler, ne récolte rien et tue peu
- **Conditions** :
  - `talking` : EXTREME_HIGH
  - `loot` : LOW
  - `killRate` : LOW
- **Priorité** : 17

---

### Priorité 16 ⭐⭐⭐

#### 🦎 L'Adaptable
- **Description** : Bon dans tous les camps
- **Conditions** :
  - `winRateVillageois` : HIGH (min: ABOVE_AVERAGE)
  - `winRateLoup` : HIGH (min: ABOVE_AVERAGE)
  - `winRateSolo` : HIGH (min: ABOVE_AVERAGE)
- **Priorité** : 16

#### ⚙️ En Rodage
- **Description** : Peine dans tous les camps
- **Conditions** :
  - `winRateVillageois` : LOW
  - `winRateLoup` : LOW
  - `winRateSolo` : LOW
- **Priorité** : 16

#### 🐺 Le Loup Solitaire
- **Description** : Loup efficace, discret et gagnant
- **Conditions** :
  - `lootLoup` : HIGH
  - `winRateLoup` : HIGH
  - `talking` : LOW
- **Priorité** : 16

#### ⚔️ Le·a Justicier·ère
- **Description** : Chasseur·se qui tue souvent et survit
- **Conditions** :
  - `roleChasseur` : HIGH
  - `killRate` : HIGH
  - `survival` : HIGH
- **Priorité** : 16

#### ⚙️ La Machine
- **Description** : Récolte énormément sans dire un mot
- **Conditions** :
  - `loot` : EXTREME_HIGH
  - `talking` : EXTREME_LOW
- **Priorité** : 16

---

### Priorité 15 ⭐⭐

#### 🦁 L'Alpha
- **Description** : Tue beaucoup et survit
- **Conditions** :
  - `killRate` : HIGH
  - `survival` : HIGH
- **Priorité** : 15

#### 🎭 L'Infiltré·e
- **Description** : Excellent·e loup discret·ète
- **Conditions** :
  - `winRateLoup` : HIGH
  - `talking` : LOW
- **Priorité** : 15

#### 🐍 Le·a Manipulateur·rice
- **Description** : Loup bavard·e et gagnant·e
- **Conditions** :
  - `winRateLoup` : HIGH
  - `talking` : HIGH
- **Priorité** : 15

#### 🎖️ Sniper Elite
- **Description** : Chasseur·se fréquent·e et précis·e
- **Conditions** :
  - `roleChasseur` : HIGH
  - `hunterAccuracy` : HIGH
- **Priorité** : 15

#### 🔫 Le·a Chasseur·se Maladroit·e
- **Description** : Chasseur·se fréquent·e mais imprécis·e
- **Conditions** :
  - `roleChasseur` : HIGH
  - `hunterAccuracy` : LOW
- **Priorité** : 15

#### 🤝 Le·a Diplomate
- **Description** : Gagne en survivant sans tuer
- **Conditions** :
  - `survival` : HIGH
  - `killRate` : LOW
  - `winRate` : HIGH
- **Priorité** : 15

#### 👁️ L'Invisible
- **Description** : Quasi muet·te mais redoutablement efficace
- **Conditions** :
  - `talking` : EXTREME_LOW
  - `winRate` : HIGH
- **Priorité** : 15

#### 🕯️ Le·a Sacrifice
- **Description** : Meurt rapidement mais fait gagner son camp
- **Conditions** :
  - `survivalDay1` : LOW
  - `survival` : LOW
  - `winRate` : HIGH
- **Priorité** : 15

---

### Priorité 14 ⭐⭐

#### ✝️ Le·a Martyr·e
- **Description** : Meurt souvent mais fait gagner son camp
- **Conditions** :
  - `survival` : LOW
  - `winRate` : HIGH
- **Priorité** : 14

#### 🐺 Le Loup Alpha
- **Description** : Survit et domine en Loup
- **Conditions** :
  - `survival` : HIGH
  - `winRateLoup` : HIGH
- **Priorité** : 14

#### 🎙️ Le·a Maître·sse de Cérémonie
- **Description** : Mène les débats et vote juste
- **Conditions** :
  - `talkingDuringMeeting` : HIGH
  - `votingAccuracy` : HIGH
  - `votingAggressive` : HIGH (min: ABOVE_AVERAGE)
- **Priorité** : 14

#### 🦊 L'Anarchiste
- **Description** : Maître des rôles solitaires
- **Conditions** :
  - `campSolo` : HIGH
  - `winRateSolo` : HIGH
- **Priorité** : 14

#### 🎩 Le·a Politicien·ne
- **Description** : Parle beaucoup, survit, mais ne récolte pas
- **Conditions** :
  - `talking` : HIGH
  - `survival` : HIGH
  - `loot` : LOW
- **Priorité** : 14

---

### Priorité 13 ⭐⭐

#### ☮️ Le·a Pacifiste
- **Description** : Gagne sans tuer
- **Conditions** :
  - `killRate` : LOW
  - `winRate` : HIGH
- **Priorité** : 13

#### 👑 Le·a Citoyen·ne Exemplaire
- **Description** : Récolte et gagne en Villageois
- **Conditions** :
  - `lootVillageois` : HIGH
  - `winRateVillageois` : HIGH
- **Priorité** : 13

#### 🎯 L'Opportuniste
- **Description** : Gagne souvent mais joue peu
- **Conditions** :
  - `winRate` : HIGH
  - `gamesPlayed` : LOW
- **Priorité** : 13

#### 🚨 Le·a Lanceur·se d'Alerte
- **Description** : Vote juste mais se fait éliminer pour ça
- **Conditions** :
  - `votingAccuracy` : HIGH
  - `survival` : LOW
- **Priorité** : 13

#### 💣 La Tête Brûlée
- **Description** : Tue beaucoup mais fait perdre son camp
- **Conditions** :
  - `killRate` : HIGH
  - `winRate` : LOW
- **Priorité** : 13

---

### Priorité 12 ⭐

#### 🗡️ L'Assassin·e
- **Description** : Ignore la récolte, se concentre sur les kills
- **Conditions** :
  - `loot` : LOW
  - `killRate` : HIGH
- **Priorité** : 12

#### 🔥 Le·a Phoenix
- **Description** : Meurt souvent tôt mais survit jusqu'au bout après
- **Conditions** :
  - `survivalDay1` : LOW
  - `survival` : HIGH
- **Priorité** : 12

#### 🔎 Le·a Détective
- **Description** : Observe silencieusement et vote juste
- **Conditions** :
  - `votingAccuracy` : HIGH
  - `talking` : LOW
- **Priorité** : 12

#### 💘 Cupidon
- **Description** : Souvent amoureux et gagnant
- **Conditions** :
  - `roleAmoureux` : HIGH
  - `winRate` : HIGH
- **Priorité** : 12

#### 💔 Roméo
- **Description** : Souvent amoureux mais perd
- **Conditions** :
  - `roleAmoureux` : HIGH
  - `winRate` : LOW
- **Priorité** : 12

#### 🐢 Le·a Couard·e
- **Description** : Survit longtemps mais perd quand même
- **Conditions** :
  - `survival` : HIGH
  - `winRate` : LOW
- **Priorité** : 12

---

### Priorité 11 ⭐

#### 🗨️ Le·a Conspirateur·rice
- **Description** : Bavard·e hors meeting, silencieux·se pendant
- **Conditions** :
  - `talkingOutsideMeeting` : HIGH
  - `talkingDuringMeeting` : LOW
- **Priorité** : 11

#### ⚖️ L'Avocat·e
- **Description** : Silencieux·se hors débats, éloquent·e en meeting
- **Conditions** :
  - `talkingOutsideMeeting` : LOW
  - `talkingDuringMeeting` : HIGH
- **Priorité** : 11

#### 💰 L'Avide
- **Description** : Récolte beaucoup mais meurt
- **Conditions** :
  - `loot` : HIGH (min: ABOVE_AVERAGE)
  - `survival` : LOW (min: BELOW_AVERAGE)
- **Priorité** : 11

#### 🛡️ Le·a Prudent·e
- **Description** : Survit mais récolte peu
- **Conditions** :
  - `loot` : LOW (min: BELOW_AVERAGE)
  - `survival` : HIGH (min: ABOVE_AVERAGE)
- **Priorité** : 11

#### 📢 Le·a Populiste
- **Description** : Bruyant·e et actif·ve mais se trompe de cible
- **Conditions** :
  - `talking` : HIGH
  - `votingAggressive` : HIGH
  - `votingAccuracy` : LOW
- **Priorité** : 11

#### 📢 La Grande Gueule
- **Description** : Parle trop et meurt Jour 1
- **Conditions** :
  - `survivalDay1` : LOW
  - `talking` : HIGH
- **Priorité** : 11

#### 🐝 L'Abeille Ouvrière
- **Description** : Récolte bien en Villageois mais perd
- **Conditions** :
  - `lootVillageois` : HIGH
  - `winRateVillageois` : LOW
- **Priorité** : 11

#### 🔦 Le Loup Repéré
- **Description** : Récolte en Loup mais se fait démasquer
- **Conditions** :
  - `lootLoup` : HIGH
  - `winRateLoup` : LOW
- **Priorité** : 11

---

### Priorité 10 ⭐

#### ⚡ L'Hyperactif·ve
- **Description** : Bavard·e ET grande récolte
- **Conditions** :
  - `talking` : HIGH
  - `loot` : HIGH
- **Priorité** : 10

#### 🎯 L'Efficace
- **Description** : Silencieux·se mais productif·ve
- **Conditions** :
  - `talking` : LOW
  - `loot` : HIGH
- **Priorité** : 10

#### 📚 Le·a Philosophe
- **Description** : Bavard·e mais improductif·ve
- **Conditions** :
  - `talking` : HIGH
  - `loot` : LOW
- **Priorité** : 10

#### 💥 Le·a Kamikaze
- **Description** : Tue mais meurt en retour
- **Conditions** :
  - `killRate` : HIGH
  - `survival` : LOW
- **Priorité** : 10

#### 🤠 Le·a Cow-Boy
- **Description** : Vote vite et souvent
- **Conditions** :
  - `votingAggressive` : HIGH
  - `votingFirst` : HIGH
- **Priorité** : 10

#### 📣 Le·a Démagogue
- **Description** : Parle beaucoup mais vote mal
- **Conditions** :
  - `talking` : HIGH
  - `votingAccuracy` : LOW
- **Priorité** : 10

#### 🔑 Le·a Taulier·e
- **Description** : Participe beaucoup et excelle dans un camp
- **Conditions** :
  - `gamesPlayed` : HIGH (min value: 100)
  - `campBalance` : SPECIALIST
- **Priorité** : 10

#### 🌟 L'Enthousiaste
- **Description** : Participe beaucoup et gagne autant dans chaque camp
- **Conditions** :
  - `gamesPlayed` : HIGH (min value: 100)
  - `campBalance` : BALANCED
- **Priorité** : 10

#### 🎓 Le·a Théoricien·ne
- **Description** : Parle beaucoup en débat mais vote peu
- **Conditions** :
  - `talkingDuringMeeting` : HIGH
  - `votingAggressive` : LOW
- **Priorité** : 10

---

### Priorité 5 ⭐

#### 👤 Monsieur·Madame Tout-le-Monde
- **Description** : Performance moyenne partout
- **Conditions** :
  - `talking` : AVERAGE
  - `loot` : AVERAGE
  - `winRate` : AVERAGE
- **Priorité** : 5

---

## 📋 Titres Simples (priorités basées sur la catégorie HIGH, LOW, etc... voir plus bas)

### Temps de Parole 🗣️

#### 🗣️ Le·a Bavard·e
- **Description** : Parle beaucoup (par 60 min de jeu)
- **Catégorie** : talking - high

#### ⚖️ Le·a Équilibré·e
- **Description** : Temps de parole normal
- **Catégorie** : talking - average

#### 🤫 Le·a Silencieux·se
- **Description** : Parle peu (par 60 min de jeu)
- **Catégorie** : talking - low

#### 💬 Le Moulin à Paroles
- **Description** : Parle énormément
- **Catégorie** : talking - extremeHigh

#### 👻 Le·a Fantôme
- **Description** : Quasi muet·te
- **Catégorie** : talking - extremeLow

---

### Temps de Parole Hors Meeting 👂

#### 👂 Le·a Chuchoteur·se
- **Description** : Bavard·e hors meeting
- **Catégorie** : talkingOutsideMeeting - high

#### 🎯 Le·a Concentré·e
- **Description** : Silencieux·se hors meeting
- **Catégorie** : talkingOutsideMeeting - low

---

### Temps de Parole En Meeting 🎤

#### 🎤 L'Orateur·rice
- **Description** : Bavard·e en meeting
- **Catégorie** : talkingDuringMeeting - high

#### 🤐 Le·a Discret·ète
- **Description** : Silencieux·se en meeting
- **Catégorie** : talkingDuringMeeting - low

---

### Taux de Kills 💀

#### 🐺 Le·a Prédateur·rice
- **Description** : Taux de kills élevé
- **Catégorie** : killRate - high

#### 🕊️ Le·a Doux·ce
- **Description** : Taux de kills faible
- **Catégorie** : killRate - low

#### 💀 L'Exterminateur·rice
- **Description** : Tueur·se en série
- **Catégorie** : killRate - extremeHigh

#### 🐑 L'Agneau
- **Description** : Ne tue jamais
- **Catégorie** : killRate - extremeLow

---

### Survie 🛡️

#### 🛡️ Le·a Survivant·e
- **Description** : Survie élevée fin de game
- **Catégorie** : survival - high

#### 🎯 La Cible
- **Description** : Meurt souvent
- **Catégorie** : survival - low

---

### Survie Jour 1 🏃

#### 🏃 Le·a Prudent·e
- **Description** : Survit au Jour 1
- **Catégorie** : survivalDay1 - high

#### ⚰️ La Première Victime
- **Description** : Meurt souvent Jour 1
- **Catégorie** : survivalDay1 - low

---

### Récolte 🌾

#### 🌾 Le·a Fermier·ère
- **Description** : Récolte élevée
- **Catégorie** : loot - high

#### 👷 Le·a Travailleur·se
- **Description** : Récolte correcte
- **Catégorie** : loot - average

#### 🚶 Le·a Flâneur·se
- **Description** : Récolte faible
- **Catégorie** : loot - low

#### ⚒️ Le·a Stakhanoviste
- **Description** : Récolte exceptionnelle
- **Catégorie** : loot - extremeHigh

#### 📸 Le·a Touriste
- **Description** : Ne récolte jamais
- **Catégorie** : loot - extremeLow

---

### Récolte Villageois 🏘️

#### 🏘️ Le·a Citoyen·ne Modèle
- **Description** : Récolte excellente en Villageois
- **Catégorie** : lootVillageois - high

#### 💤 Le·a Villageois·e Paresseux·se
- **Description** : Faible récolte en Villageois
- **Catégorie** : lootVillageois - low

---

### Récolte Loup 🐺

#### 🐺 Le Loup Discret
- **Description** : Récolte élevée en Loup (camouflage)
- **Catégorie** : lootLoup - high

#### 😤 Le Loup Impatient
- **Description** : Faible récolte en Loup
- **Catégorie** : lootLoup - low

---

### Vote Agressif 📢

#### 📢 L'Agitateur·rice
- **Description** : Voteur·se agressif·ve
- **Catégorie** : votingAggressive - high

#### 🧘 Le·a Sage
- **Description** : Voteur·se passif·ve
- **Catégorie** : votingAggressive - low

#### ⚖️ Le·a Tribun·e
- **Description** : Toujours en action
- **Catégorie** : votingAggressive - extremeHigh

#### 🤷 L'Indécis·e
- **Description** : Vote rarement
- **Catégorie** : votingAggressive - extremeLow

---

### Vote Rapide 🏃

#### 🏃 L'Impulsif·ve
- **Description** : Premier·ère voteur·se
- **Catégorie** : votingFirst - high

#### 🧠 Le·a Stratège
- **Description** : Attend avant de voter
- **Catégorie** : votingFirst - low

---

### Précision de Vote 👃

#### 👃 Le·a Flaireur·se
- **Description** : Bon instinct de vote
- **Catégorie** : votingAccuracy - high

#### 🙈 L'Aveugle
- **Description** : Mauvais instinct de vote
- **Catégorie** : votingAccuracy - low

---

### Précision Chasseur 🎯

#### 🎯 Le·a Sniper
- **Description** : Bon·ne chasseur·se (tue des ennemis)
- **Catégorie** : hunterAccuracy - high

#### 👓 Le·a Myope
- **Description** : Mauvais·e chasseur·se (tue des alliés)
- **Catégorie** : hunterAccuracy - low

#### ⚔️ L'Exécuteur·rice
- **Description** : Chasseur·se parfait·e
- **Catégorie** : hunterAccuracy - extremeHigh

#### 💔 Le·a Chasseur·se Maudit·e
- **Description** : Tire toujours sur les mauvaises cibles
- **Catégorie** : hunterAccuracy - extremeLow

---

### Taux de Victoire 🏆

#### 🏆 Le·a Winner
- **Description** : Taux de victoire élevé
- **Catégorie** : winRate - high

#### 📊 Le·a Constant·e
- **Description** : Performance stable
- **Catégorie** : winRate - average

#### 😢 Le·a Looser
- **Description** : Taux de victoire faible
- **Catégorie** : winRate - low

#### 👑 L'Inarrêtable
- **Description** : Gagne presque toujours
- **Catégorie** : winRate - extremeHigh

#### 🪦 Le·a Maudit·e
- **Description** : Perd presque toujours
- **Catégorie** : winRate - extremeLow

---

### Victoires Villageois 🦸

#### 🦸 Le·a Protecteur·rice du Village
- **Description** : Excellent·e en camp Villageois
- **Catégorie** : winRateVillageois - high

#### 🤡 Idiot·e en Formation
- **Description** : Mauvais·e en camp Villageois
- **Catégorie** : winRateVillageois - low

---

### Victoires Loup 🐺

#### 🐺 Le·a Chef de Meute
- **Description** : Excellent·e en camp Loup
- **Catégorie** : winRateLoup - high

#### 🐩 Loup Débutant·e
- **Description** : Mauvais·e en camp Loup
- **Catégorie** : winRateLoup - low

---

### Victoires Solo 🦊

#### 🦊 L'Électron Libre
- **Description** : Excellent·e en rôles Solo
- **Catégorie** : winRateSolo - high

#### 👶 L'Enfant Perdu·e
- **Description** : Mauvais·e en rôles Solo
- **Catégorie** : winRateSolo - low

---

### Séries de Victoires 🔥

#### 🔥 En Feu
- **Description** : Grosse série de victoires
- **Catégorie** : winSeries - high

---

### Séries de Défaites ❄️

#### ❄️ Glacé·e
- **Description** : Grosse série de défaites
- **Catégorie** : lossSeries - high

---

### Attribution de Camp 🏘️🌙

#### 🏘️ Serial Villageois·e
- **Description** : Joue souvent Villageois
- **Catégorie** : campAssignment - villageois

#### 🌙 Serial Loup
- **Description** : Joue souvent Loup
- **Catégorie** : campAssignment - loup

#### 🎭 Serial Solo
- **Description** : Joue souvent en Solo
- **Catégorie** : campAssignment - solo

---

### Attribution de Rôle Spécifique 🎭

#### 🔫 Serial Chasseur
- **Description** : Joue souvent Chasseur
- **Catégorie** : roleAssignment - chasseur

#### ⚗️ Serial Alchimiste
- **Description** : Joue souvent Alchimiste
- **Catégorie** : roleAssignment - alchimiste

#### 💕 Serial Amoureux
- **Description** : Joue souvent Amoureux
- **Catégorie** : roleAssignment - amoureux

#### 🕵️ Serial Agent
- **Description** : Joue souvent Agent
- **Catégorie** : roleAssignment - agent

#### 🔍 Serial Espion
- **Description** : Joue souvent Espion
- **Catégorie** : roleAssignment - espion

#### 🃏 Serial Idiot
- **Description** : Joue souvent Idiot du Village
- **Catégorie** : roleAssignment - idiot

#### 💰 Serial Bounty Hunter
- **Description** : Joue souvent Chasseur de Prime
- **Catégorie** : roleAssignment - chasseurDePrime

#### 📦 Serial Contrebandier
- **Description** : Joue souvent Contrebandier
- **Catégorie** : roleAssignment - contrebandier

#### 🦁 Serial Bête
- **Description** : Joue souvent La Bête
- **Catégorie** : roleAssignment - bete

#### 🎃 Serial Vaudou
- **Description** : Joue souvent Vaudou
- **Catégorie** : roleAssignment - vaudou

#### 🔬 Serial Scientifique
- **Description** : Joue souvent Scientifique
- **Catégorie** : roleAssignment - scientifique

---

### Participation 🌙

#### 🌙 Le·a Noctambule
- **Description** : Joue énormément de parties
- **Catégorie** : participation - high

#### 🎲 Le·a Occasionnel·le
- **Description** : Joue peu de parties
- **Catégorie** : participation - low

---

### Équilibre de Camp 🎭

#### 🎭 Le·a Polyvalent·e
- **Description** : Performance équilibrée dans tous les camps
- **Catégorie** : campBalance - balanced

#### 🎯 Le·a Spécialiste
- **Description** : Excellent dans un camp spécifique
- **Catégorie** : campBalance - specialist

---

## 📝 Notes

### Catégories de Stats (par rapport à la moyenne des joueurs)
- **HIGH** : Valeur élevée
- **LOW** : Valeur basse
- **AVERAGE** : Valeur moyenne
- **EXTREME_HIGH** : Valeur extrêmement élevée
- **EXTREME_LOW** : Valeur extrêmement basse
- **ABOVE_AVERAGE** : Au-dessus de la moyenne
- **BELOW_AVERAGE** : En-dessous de la moyenne
- **BALANCED** : Équilibré
- **SPECIALIST** : Spécialisé

### Priorités

#### Titres Combinés
- Les titres combinés ont des priorités de **5 à 20**
- Plus la priorité est élevée, plus le titre est rare et prestigieux
- Certains titres combinés peuvent avoir des conditions minimales supplémentaires (minCategory ou minValue)

#### Titres Simples
Les titres simples ont des priorités fixes basées sur leur catégorie :
- **Priorité 8** : Titres extrêmes (EXTREME_HIGH, EXTREME_LOW) - les plus remarquables
- **Priorité 6** : Titres élevés/bas (HIGH, LOW) - au-dessus ou en-dessous de la moyenne
- **Priorité 5** : Titres moyens (AVERAGE) - performance normale
- **Priorité 4** : Titres équilibrés ou standards

Les titres simples sont attribués en fonction d'une seule statistique, mais leur priorité détermine leur importance lors de la sélection du titre principal affiché.

### Types de Titres
- **Titres Contrôlables** : Basés sur des stats que le joueur peut influencer (parole, récolte, kills, etc.)
- **Titres Incontrôlables** : Basés sur l'attribution aléatoire des rôles (Serial Chasseur, Serial Loup, etc.)
- **Titres Combinés** : Nécessitent plusieurs conditions simultanées pour être débloqués
