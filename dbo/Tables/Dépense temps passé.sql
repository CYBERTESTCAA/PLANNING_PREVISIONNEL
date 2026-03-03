CREATE TABLE [dbo].[Dépense temps passé] (

	[IdEntreprise] varchar(255) NULL, 
	[Date] date NULL, 
	[IdSalarié] varchar(255) NULL, 
	[IdArticle] varchar(255) NULL, 
	[Code commande client] varchar(255) NULL, 
	[Code OF] varchar(255) NULL, 
	[IdMatériel] varchar(255) NULL, 
	[IdPostegestion] varchar(255) NULL, 
	[Unité] varchar(255) NULL, 
	[Temps] float NULL, 
	[Coût unitaire] float NULL, 
	[Coût] float NULL, 
	[Coût * coef 1] float NULL
);