/// How often a failed request is retried before the screen says so.
///
/// Riverpod 3 retries failures automatically and, by default, keeps going —
/// which leaves a screen on its spinner indefinitely when the phone is
/// offline, never showing the "could not be reached / Try again" message.
/// Two quick retries cover a blip; after that the visitor is told.
Duration? spiritpediaRetry(int retryCount, Object error) =>
    retryCount >= 2 ? null : Duration(milliseconds: 500 * (retryCount + 1));
