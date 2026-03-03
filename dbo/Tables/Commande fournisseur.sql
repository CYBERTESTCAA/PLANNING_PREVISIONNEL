CREATE TABLE [dbo].[Commande fournisseur] (

	[Code commande] varchar(255) NULL, 
	[IdEntreprise] varchar(255) NOT NULL, 
	[Titre commande] varchar(255) NULL, 
	[IdFournisseur] varchar(255) NOT NULL, 
	[IdSalariéAcheteur] varchar(255) NULL, 
	[IdActivité] varchar(255) NOT NULL, 
	[IdSecteuractivité] varchar(255) NOT NULL, 
	[Date création] date NULL, 
	[Date commande] date NULL, 
	[Délai livraison] date NULL, 
	[Date livraison] date NULL, 
	[Est soldée] bit NULL, 
	[Montant HT] float NULL, 
	[Montant TTC] float NULL, 
	[Poids] float NULL, 
	[Volume] float NULL
);