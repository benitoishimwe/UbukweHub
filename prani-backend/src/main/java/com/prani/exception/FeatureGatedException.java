package com.prani.exception;

public class FeatureGatedException extends RuntimeException {
    private final String featureKey;
    public FeatureGatedException(String featureKey) {
        super("Feature '" + featureKey + "' requires a paid subscription");
        this.featureKey = featureKey;
    }
    public String getFeatureKey() { return featureKey; }
}
