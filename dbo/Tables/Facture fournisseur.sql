CREATE TABLE [dbo].[Facture fournisseur] (

	[Code facture] varchar(255) NULL, 
	[IdEntreprise] varchar(255) NOT NULL, 
	[Titre facture] varchar(255) NULL, 
	[IdFournisseur] varchar(255) NOT NULL, 
	[Code salarié acheteur] varchar(255) NULL, 
	[IdActivité] varchar(255) NOT NULL, 
	[IdSecteuractivité] varchar(255) NOT NULL, 
	[Date création] date NULL, 
	[Date facture] date NULL, 
	[Date échéance] date NULL, 
	[Est comptabilisée] bit NULL, 
	[Est soldée] bit NULL, 
	[Etat] varchar(255) NULL, 
	[Est avoir] bit NULL, 
	[Type] varchar(255) NULL, 
	[Est validée] bit NULL, 
	[Montant HT] float NULL, 
	[Montant TTC] float NULL, 
	[Poids] float NULL, 
	[Volume] float NULL
);