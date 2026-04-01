# Rapport des Anomalies et Observations Techniques (30-03-2026)

Ce document récapitule les observations techniques et bugs identifiés pour l'application Tijara Pro.

## 1. CONFIGURATION

| Écran          | Observation / Bug                                                                                                                                                                                                                         | Type    | Statut |
| :------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :------ | :----- |
| **Catégories** | Lors du clic sur l'icône de modification d'une catégorie, le détail de la 1ère catégorie s'affiche au lieu de la catégorie sélectionnée. Cependant, l'enregistrement des modifications s'applique correctement sur la catégorie en cours. | MOYENNE | OK     |
| **Banques**    | Bug : Un message d'erreur s'affiche systématiquement lors du clic sur le bouton "Créer".                                                                                                                                                  | URGENTE | -      |

---

## 2. ADMINISTRATION

| Écran                    | Observation / Bug                                                                                                                          | Type    |
| :----------------------- | :----------------------------------------------------------------------------------------------------------------------------------------- | :------ |
| **Gestion des Sociétés** | Le logo ajouté par l'utilisateur n'apparaît pas dans la zone d'affichage dédiée.                                                           | MOYENNE |
| **Sécurité/Auth**        | Ajouter le contrôle du format de l'Email (doit respecter : `xxxx@xxxx.yy`).                                                                | URGENTE |
| **Interface**            | Afficher le logo de la société sélectionnée dans la partie inférieure gauche de l'écran (sous le menu).                                    | URGENTE |
| **Suppression**          | Permettre la suppression d'une société si elle ne possède aucun détail associé (ex: suppression de Retail Express & Tech Solutions Maroc). | MOYENNE |

---

## 3. REFERENTIELS

### Produits

| Observation / Bug                                                                                              | Type    | Statut |
| :------------------------------------------------------------------------------------------------------------- | :------ | :----- |
| L'image du produit ne s'affiche pas dans la zone prévue après l'ajout.                                         | MOYENNE | NOK    |
| La catégorie d'un produit ne s'affiche pas dans l'écran de liste initial des produits.                         | URGENTE | OK     |
| Ajouter une colonne "Image" dans la liste initiale qui affiche tous les produits.                              | MOYENNE | OK     |
| Supprimer le terme "(SKU)" affiché au niveau de la "Référence Interne" (onglets Infos Générales et Attributs). | MOYENNE | OK     |
| **Duplication** : L'onglet "Attributs et variantes" n'est pas copié correctement lors de la duplication.       | MOYENNE | NOK    |
| Remplacer "Export CSV" par "Export Excel" avec un tableau correctement formaté.                                | MOYENNE | OK     |
| Bug : Message d'erreur lors de l'enregistrement si aucune modification n'a été effectuée.                      | URGENTE | NOK    |

### Fournisseurs

| Observation / Bug                                                                                          | Type    | Statut |
| :--------------------------------------------------------------------------------------------------------- | :------ | :----- |
| Ajouter le champ email de la société avec son contrôle dans l'onglet "Infos Générales".                    | URGENTE | -      |
| **Infos Bancaires** : Le champ doit afficher la liste des banques configurées (actuellement liste vide).   | MOYENNE | NOK    |
| Problème d'affichage : 2 écrans s'affichent l'un sous l'autre lors de la modification (écrans différents). | -      | -      |
| **Total achats** : Affiche un code UUID au lieu du montant réel.                                           | -      | -      |
| Remplacer le champ "Statut" par une option "Actif Oui/Non" en bas de fiche.                                | URGENTE | OK     |
| Ajouter le contrôle du format Email (xxxx@xxxx.yy).                                                        | MOYENNE | OK     |
| Bug : Message d'erreur lors du clic direct sur le menu "Fournisseurs".                                     | URGENTE | NOK    |
| Colonnes manquantes dans la liste : Plafond crédit (MAD), Total achats, Encours.                           | URGENTE | NOK    |
| Renommer l'onglet "Audit" en "Historique" et afficher l'historique des opérations.                         | MOYENNE | NOK    |

### Clients

| Observation / Bug                                                                  | Type    | Statut |
| :--------------------------------------------------------------------------------- | :------ | :----- |
| Informations Bancaires : Liste des banques vide (impossible d'ajouter une banque). | MOYENNE | -      |
| Ajouter le contrôle Email dans "Infos Générales" et "Contacts".                    | MOYENNE | -      |
| Bug : Message d'erreur lors du clic direct sur Clients (Similaire fournisseurs).   | URGENTE | -      |
| Ajouter le champ email société avec contrôle dans "Infos Générales".               | URGENTE | OK     |
| Renommer l'onglet "Audit" en "Historique".                                         | MOYENNE | NOK    |

---

## 4. FACTURATION

| Écran                    | Observation / Bug                                                                                | Type    | Note Technique                                       |
| :----------------------- | :----------------------------------------------------------------------------------------------- | :------ | :--------------------------------------------------- |
| **Factures Fournisseur** | Appliquer les mêmes remarques d'impression que pour le Bon de Commande Fournisseur.              | URGENTE | -                                                    |
| **Paiement Facture**     | Le clic sur "Payer la facture" redirige vers "Encaissements Clients" au lieu de "Décaissements". | URGENTE | Ouvrir directement l'écran de décaissement en cours. |
| **Avoirs**               | L'écran affiche les tiers de toutes les sociétés. Filtrer par société active.                    | URGENTE | -                                                    |
| **Avoirs**               | Permettre la consultation du détail après validation ou annulation.                              | -      | -                                                    |

---

## 5. REGLEMENTS

| Écran             | Observation / Bug                                                        | Type    |
| :---------------- | :----------------------------------------------------------------------- | :------ |
| **Décaissements** | Supprimer le champ montant vide au niveau de l'entête.                   | URGENTE |
| **Décaissements** | Message d'erreur bloquant si le montant n'est pas saisi manuellement.    | URGENTE |
| **Décaissements** | Le système ne permet pas de modifier ou de valider un décaissement créé. | -      |

---

## 6. VENTES

### Devis

| Observation / Bug                                                                                                   | Type      | Statut |
| :------------------------------------------------------------------------------------------------------------------ | :-------- | :----- |
| Remplacer le texte "Aucun document" par "Aucun Devis".                                                              | URGENTE   | -      |
| Agrandir la fenêtre "Nouveau devis" pour voir tous les champs.                                                      | MOYENNE   | NOK    |
| Harmonisation : L'écran doit être similaire à la demande de prix (colonnes, tableaux).                              | URGENTE   | NOK    |
| **Doublons** : Le devis est créé deux fois en cas de double clic sur "Enregistrer".                                 | URGENTE   | OK     |
| Ajouter l'action "Supprimer" pour l'auteur du devis avant validation.                                               | MOYENNE   | NOK    |
| **Interface** : Supprimer le champ "Dépôts" qui s'affiche inutilement dans un écran secondaire.                     | BLOQUANTE | NOK    |
| **Envoi Mail** : Inclure le mail du client et les mails des contacts associés.                                      | URGENTE   | -      |
| **Saisie** : Le produit sélectionné doit disparaître de la liste de recherche lors de l'ajout d'une nouvelle ligne. | MOYENNE   | -      |
| **Flux de données** : Le BC n'est pas créé lors de la validation du devis (passe directement à la livraison).       | URGENTE   | -      |

### Commandes & Livraisons

| Écran               | Observation / Bug                                                                          | Type    |
| :------------------ | :----------------------------------------------------------------------------------------- | :------ |
| **Commande Client** | Bouton "Nouveau BC" inexistant. Impossible d'ajouter un BC directement.                    | URGENTE |
| **Livraisons**      | Le système doit contrôler les livraisons (totales/partielles) à partir du Bon de Commande. | -      |
