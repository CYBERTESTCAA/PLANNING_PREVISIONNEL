create   procedure loaddata
as 
BEGIN 

    TRUNCATE table table1
    INSERT INTO table1 
    SELECT top 5 Affaire FROM [LKH_GROUPE_CAA].[dbo].[DIM Affaire GUA]

end