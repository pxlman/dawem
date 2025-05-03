// babel.config.js
module.exports = function(api) {
  api.cache(true); // Cache the configuration for faster builds
  return {
    presets: ['babel-preset-expo'], // Use Expo's default Babel preset
    plugins: [
      // Add other Babel plugins here if you have any...
      // For example: ['module:react-native-dotenv']

      // IMPORTANT: react-native-reanimated/plugin MUST BE LAST in this list!
      'react-native-reanimated/plugin',
    ],
  };
};