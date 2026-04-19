package com.prani.security;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class PraniAuthPrincipal {
    private final String userId;
    private final String email;
    private final String role;
}
