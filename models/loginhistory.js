'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class LoginHistory extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
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
    },
    {
      sequelize,
      modelName: "LoginHistory",
    }
  );
  return LoginHistory;
};