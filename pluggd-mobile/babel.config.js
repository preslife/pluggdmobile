module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            "react-native-css-interop/dist/babel-plugin",
            ["@babel/plugin-transform-react-jsx", { runtime: "automatic", importSource: "nativewind" }],
            "react-native-reanimated/plugin",
        ],
    };
};
