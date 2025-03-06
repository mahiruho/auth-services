"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class DeviceSession extends Model {
    static associate(models) {
      DeviceSession.belongsTo(models.User, { foreignKey: "user_id" });
    }
  }
  DeviceSession.init(
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
        onDelete: "CASCADE",
      },
      session_id: {
        type: DataTypes.UUID,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4,
      },
      device: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      ip_address: {
        type: DataTypes.INET,
        allowNull: false,
      },
      login_time: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      last_active: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      sequelize,
      modelName: "DeviceSession",
    }
  );
  return DeviceSession;
};
