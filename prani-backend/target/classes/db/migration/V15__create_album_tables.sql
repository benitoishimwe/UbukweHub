CREATE TABLE albums (
    album_id     VARCHAR(36)  PRIMARY KEY,
    event_id     VARCHAR(36)  NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    token        VARCHAR(64)  NOT NULL UNIQUE,
    title        VARCHAR(255),
    description  TEXT,
    is_active    BOOLEAN      NOT NULL DEFAULT true,
    max_file_size_mb INTEGER  NOT NULL DEFAULT 50,
    allow_videos BOOLEAN      NOT NULL DEFAULT true,
    created_by   VARCHAR(36)  NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_albums_event_id ON albums(event_id);
CREATE INDEX idx_albums_token    ON albums(token);

CREATE TABLE album_media (
    media_id      VARCHAR(36)   PRIMARY KEY,
    album_id      VARCHAR(36)   NOT NULL REFERENCES albums(album_id) ON DELETE CASCADE,
    file_name     VARCHAR(500)  NOT NULL,
    original_name VARCHAR(500),
    file_type     VARCHAR(100)  NOT NULL,
    media_type    VARCHAR(10)   NOT NULL,
    file_size     BIGINT        NOT NULL,
    file_url      VARCHAR(1000) NOT NULL,
    thumbnail_url VARCHAR(1000),
    uploader_name VARCHAR(255),
    is_favorite   BOOLEAN       NOT NULL DEFAULT false,
    uploaded_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_album_media_album_id ON album_media(album_id);
