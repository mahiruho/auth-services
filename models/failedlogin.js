"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class FailedLogin extends Model {
    static associate(models) {
      // define association here
      FailedLogin.belongsTo(models.User, {
        foreignKey: "user_id",
        onDelete: "CASCADE",
      });
    }
  }
  FailedLogin.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: true, // Can be null if email does not exist in the system
        references: { model: "Users", key: "id" },
        onDelete: "CASCADE",
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      attempt_time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      ip_address: DataTypes.STRING,
      device: DataTypes.STRING,
      reason: DataTypes.STRING,
      attempt_count: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: "FailedLogin",
    }
  );
  return FailedLogin;
};
