'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class FailedLogin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  FailedLogin.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
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
    },
    {
      sequelize,
      modelName: "FailedLogin",
    }
  );
  return FailedLogin;
};