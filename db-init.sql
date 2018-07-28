CREATE DATABASE IF NOT EXISTS `lockbox` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

use `lockbox`;

CREATE TABLE IF NOT EXISTS `users` (
  `RowId` int(11) NOT NULL AUTO_INCREMENT,
  `UserId` varchar(45) NOT NULL,
  `Email` varchar(128) NOT NULL,
  `Password` text NOT NULL,
  `Salt` varchar(64) NOT NULL,
  `IV` varchar(64) NOT NULL,
  `PrivateKey` longtext NOT NULL,
  `PublicKey` text NOT NULL,
  `Confirm` varchar(64) DEFAULT NULL,
  `Active` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`RowId`),
  UNIQUE KEY `UserId_UNIQUE` (`UserId`),
  UNIQUE KEY `Email_UNIQUE` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `RowId` int(11) NOT NULL AUTO_INCREMENT,
  `SessionKey` varchar(32) NOT NULL,
  `UserId` varchar(45) NOT NULL,
  `Expires` bigint(20) NOT NULL,
  `Active` tinyint(1) NOT NULL DEFAULT '1',
  `Created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `LastUsed` bigint(20) NOT NULL,
  `UserAgent` text,
  PRIMARY KEY (`RowId`),
  UNIQUE KEY `SessionKey_UNIQUE` (`SessionKey`),
  KEY `user_idx` (`UserId`),
  CONSTRAINT `user` FOREIGN KEY (`UserId`) REFERENCES `users` (`UserId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `files` (
  `RowId` int(11) NOT NULL AUTO_INCREMENT,
  `Id` varchar(45) NOT NULL,
  `EncryptedName` text NOT NULL,
  `IV` text,
  `IsDirectory` tinyint(1) NOT NULL DEFAULT '0',
  `ParentId` varchar(45) DEFAULT NULL,
  `LastModifiedDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `CreatedDate` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`RowId`),
  UNIQUE KEY `Id_UNIQUE` (`Id`),
  KEY `parent_idx` (`ParentId`),
  CONSTRAINT `parent` FOREIGN KEY (`ParentId`) REFERENCES `files` (`Id`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `user_access` (
  `RowId` int(11) NOT NULL AUTO_INCREMENT,
  `UserId` varchar(45) NOT NULL,
  `FileId` varchar(45) NOT NULL,
  `EncryptedKey` text NOT NULL,
  `Active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`RowId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='A table to map users to their files with the included Key';

