-- Schema do banco de dados - Habit Tracker
-- Execute este script no SQL Server antes de iniciar a aplicação

CREATE DATABASE HabitTrackerDB;
GO

USE HabitTrackerDB;
GO

CREATE TABLE Usuario (
    id INT IDENTITY(1,1) PRIMARY KEY,
    nome NVARCHAR(100) NOT NULL,
    email NVARCHAR(150) NOT NULL UNIQUE,
    senha_hash NVARCHAR(255) NOT NULL,
    data_criacao DATETIME NOT NULL DEFAULT GETDATE()
);
GO

CREATE TABLE Habito (
    id INT IDENTITY(1,1) PRIMARY KEY,
    usuario_id INT NOT NULL,
    nome NVARCHAR(100) NOT NULL,
    descricao NVARCHAR(255) NULL,
    categoria NVARCHAR(50) NOT NULL DEFAULT 'geral',
    frequencia NVARCHAR(20) NOT NULL DEFAULT 'diario', -- diario | semanal
    ativo BIT NOT NULL DEFAULT 1,
    data_criacao DATETIME NOT NULL DEFAULT GETDATE(),
    CONSTRAINT FK_Habito_Usuario FOREIGN KEY (usuario_id)
        REFERENCES Usuario(id) ON DELETE CASCADE
);
GO

CREATE TABLE RegistroHabito (
    id INT IDENTITY(1,1) PRIMARY KEY,
    habito_id INT NOT NULL,
    data DATE NOT NULL,
    concluido BIT NOT NULL DEFAULT 0,
    observacao NVARCHAR(255) NULL,
    CONSTRAINT FK_Registro_Habito FOREIGN KEY (habito_id)
        REFERENCES Habito(id) ON DELETE CASCADE,
    CONSTRAINT UQ_Habito_Data UNIQUE (habito_id, data)
);
GO

-- Índices para acelerar filtros e paginação
CREATE INDEX IX_Habito_Categoria ON Habito(categoria);
CREATE INDEX IX_Habito_Usuario ON Habito(usuario_id);
CREATE INDEX IX_Registro_Data ON RegistroHabito(data);
GO

-- Dados de exemplo (opcional): cria um usuário de teste e alguns hábitos
-- Senha do usuário de teste: "123456" (já em hash bcrypt)
INSERT INTO Usuario (nome, email, senha_hash) VALUES
('Usuário Teste', 'teste@trilha.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy');
GO

INSERT INTO Habito (usuario_id, nome, descricao, categoria, frequencia) VALUES
(1, 'Beber água', 'Beber pelo menos 2 litros de água por dia', 'saude', 'diario'),
(1, 'Estudar', 'Estudar por 1 hora', 'estudo', 'diario'),
(1, 'Caminhar', 'Caminhar 30 minutos', 'saude', 'diario'),
(1, 'Ler', 'Ler 10 páginas de um livro', 'lazer', 'diario'),
(1, 'Meditar', 'Meditar por 10 minutos', 'bem-estar', 'diario');
GO
