'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  User.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      firebase_uid: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      full_name: {
        type: DataTypes.STRING,
      },
      phone_number: {
        type: DataTypes.STRING,
        unique: true,
      },
      profile_pic: {
        type: DataTypes.TEXT,
      },
      signup_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      last_login: {
        type: DataTypes.DATE,
      },
      email_verified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: "User",
    }
  );
  return User;
};