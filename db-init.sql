CREATE DATABASE IF NOT EXISTS `lockbox` /*!40100 DEFAULT CHARACTER SET utf8mb4 */;

USE `lockbox`;

CREATE TABLE IF NOT EXISTS `users` (
  `UserId` int(11) NOT NULL AUTO_INCREMENT,
  `Email` varchar(128) NOT NULL,
  `Salt` varchar(64) NOT NULL,
  `IV` varchar(64) NOT NULL,
  `PrivateKey` LONGTEXT NOT NULL,
  `PublicKey` TEXT NOT NULL,
  `Confirm` varchar(64) DEFAULT NULL,
  `Active` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`UserId`),
  UNIQUE KEY `UserId_UNIQUE` (`UserId`),
  UNIQUE KEY `Email_UNIQUE` (`Email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `sessions` (
  `SessionId` int(11) NOT NULL AUTO_INCREMENT,
  `SessionKey` varchar(32) NOT NULL,
  `UserId` int(11) NOT NULL,
  `Expires` bigint(20) NOT NULL,
  `Active` tinyint(1) NOT NULL DEFAULT '1',
  `Created` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `LastUsed` bigint(20) NOT NULL,
  `UserAgent` text,
  PRIMARY KEY (`SessionId`),
  UNIQUE KEY `SessionId_UNIQUE` (`SessionId`),
  UNIQUE KEY `SessionKey_UNIQUE` (`SessionKey`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `challenges` (
  `ChallengeId` int(11) NOT NULL AUTO_INCREMENT,
  `UserId` int(11) NOT NULL,
  `Solution` text NOT NULL,
  `Nonce` varchar(64) NOT NULL,
  `Completed` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`ChallengeId`),
  UNIQUE KEY `ChallengeId_UNIQUE` (`ChallengeId`),
  UNIQUE KEY `Nonce_UNIQUE` (`Nonce`),
  KEY `User_idx` (`UserId`),
  CONSTRAINT `User` FOREIGN KEY (`UserId`) REFERENCES `users` (`UserId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

