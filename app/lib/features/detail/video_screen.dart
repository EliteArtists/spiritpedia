import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';
import 'package:webview_flutter_wkwebview/webview_flutter_wkwebview.dart';

import '../../core/links/open_link.dart';
import '../../data/models.dart';
import '../../theme/colors.dart';
import '../library/saved_items.dart';
import 'detail_providers.dart';
import 'detail_widgets.dart';

/// The embedded player. A provider so widget tests, which have no web view,
/// can swap in a stand-in.
final videoPlayerBuilderProvider =
    Provider<Widget Function(String youtubeId, String title)>(
      (ref) =>
          (id, title) => PrivacyEnhancedPlayer(youtubeId: id, title: title),
    );

/// A video (web/app/videos/[slug]/page.js).
class VideoScreen extends ConsumerWidget {
  const VideoScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final player = ref.watch(videoPlayerBuilderProvider);
    return DetailScaffold<Video>(
      value: ref.watch(videoProvider(slug)),
      onRetry: () => ref.invalidate(videoProvider(slug)),
      notFoundLabel: 'video',
      saveKind: SavedKind.videos,
      saveSlug: slug,
      builder: (context, video) {
        final id = video.youtubeId;
        final url = video.platformUrl;
        return ListView(
          padding: detailPadding,
          children: [
            DetailTitle(video.title),
            const SizedBox(height: 8),
            ByLine(healerSlug: video.healerSlug),
            const SizedBox(height: 18),
            AspectRatio(
              aspectRatio: 16 / 9,
              child: ClipRRect(
                borderRadius: BorderRadius.circular(16),
                child: id != null
                    ? ColoredBox(
                        color: Colors.black,
                        child: player(id, video.title),
                      )
                    : _NoEmbed(url: url),
              ),
            ),
            if (url != null) ...[
              const SizedBox(height: 18),
              OutboundButton(
                label: id != null
                    ? 'Watch on YouTube'
                    : 'Watch on ${platformName(url)}',
                url: url,
                background: const Color(0xFFFF0000),
              ),
            ],
            if (video.subjectSlugs.isNotEmpty) ...[
              const SizedBox(height: 26),
              SubjectChips(video.subjectSlugs),
            ],
          ],
        );
      },
    );
  }
}

/// The website's platformName(): the host without www.
String platformName(String url) {
  final host = Uri.tryParse(url)?.host ?? '';
  return host.isEmpty
      ? 'the original site'
      : host.replaceFirst(RegExp(r'^www\.'), '');
}

class _NoEmbed extends StatelessWidget {
  const _NoEmbed({required this.url});

  final String? url;

  @override
  Widget build(BuildContext context) {
    final label = url == null
        ? const Text(
            'No video link available',
            style: TextStyle(color: SpColors.textFaint),
          )
        : Text(
            'Watch on ${platformName(url!)} →',
            style: const TextStyle(
              color: SpColors.link,
              fontWeight: FontWeight.w600,
            ),
          );
    return Material(
      color: SpColors.surface,
      child: InkWell(
        onTap: url == null ? null : () => openExternal(context, url!),
        child: Center(child: label),
      ),
    );
  }
}

/// YouTube's privacy-enhanced mode, exactly as the website embeds it:
/// youtube-nocookie.com sets no YouTube cookies until the video is played.
/// The Privacy Policy describes this — change both together.
///
/// The frame is hosted in a small page whose origin is the website's, as on
/// the website. Anything the player links to (the YouTube logo, "More videos")
/// opens outside the app; the web view only ever shows the player.
class PrivacyEnhancedPlayer extends StatefulWidget {
  const PrivacyEnhancedPlayer({
    super.key,
    required this.youtubeId,
    required this.title,
  });

  final String youtubeId;
  final String title;

  @override
  State<PrivacyEnhancedPlayer> createState() => _PrivacyEnhancedPlayerState();
}

class _PrivacyEnhancedPlayerState extends State<PrivacyEnhancedPlayer> {
  late final WebViewController _controller;

  static const _origin = 'https://www.spiritpedia.co';

  /// The only top-level page the web view may show: the player host page.
  static bool _isHostPage(String url) =>
      url == '$_origin/' || url == _origin || url.startsWith('about:');

  @override
  void initState() {
    super.initState();
    final PlatformWebViewControllerCreationParams params =
        WebViewPlatform.instance is WebKitWebViewPlatform
        ? WebKitWebViewControllerCreationParams(
            allowsInlineMediaPlayback: true,
            mediaTypesRequiringUserAction: const {
              PlaybackMediaTypes.audio,
              PlaybackMediaTypes.video,
            },
          )
        : const PlatformWebViewControllerCreationParams();
    final id = Uri.encodeComponent(widget.youtubeId);
    final title = htmlEscape.convert(widget.title);
    _controller = WebViewController.fromPlatformCreationParams(params)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            // The player frame loads freely; any top-level move away from
            // the host page leaves the app instead.
            if (!request.isMainFrame || _isHostPage(request.url)) {
              return NavigationDecision.navigate;
            }
            if (mounted) openExternal(context, request.url);
            return NavigationDecision.prevent;
          },
        ),
      )
      ..loadHtmlString('''
<!doctype html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta name="referrer" content="strict-origin-when-cross-origin">
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%}</style>
</head><body>
<iframe src="https://www.youtube-nocookie.com/embed/$id?rel=0&playsinline=1"
 title="$title"
 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
 allowfullscreen></iframe>
</body></html>''', baseUrl: '$_origin/');
    if (_controller.platform is AndroidWebViewController) {
      (_controller.platform as AndroidWebViewController)
          .setMediaPlaybackRequiresUserGesture(true);
    }
  }

  @override
  Widget build(BuildContext context) =>
      WebViewWidget(controller: _controller, gestureRecognizers: const {});
}
