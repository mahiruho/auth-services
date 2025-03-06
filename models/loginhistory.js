"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class LoginHistory extends Model {
    static associate(models) {
      // define association here
      LoginHistory.belongsTo(models.User, { foreignKey: "user_id" });
    }
  }
  LoginHistory.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: { model: "Users", key: "id" },
      },
      login_time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      ip_address: DataTypes.STRING,
      device: DataTypes.STRING,
      location: DataTypes.STRING,
      session_id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        unique: true,
      },
    },
    {
      sequelize,
      modelName: "LoginHistory",
    }
  );
  return LoginHistory;
};
