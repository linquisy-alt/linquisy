import 'package:material_ui/material_ui.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models/models.dart';

/// One open-access result inside a Librarian message.
class PaperCard extends StatelessWidget {
  const PaperCard({super.key, required this.result});

  final PaperResult result;

  Future<void> _open(BuildContext context, String url) async {
    final ok = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
    if (!ok && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Could not open $url')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final r = result;
    final text = Theme.of(context).textTheme;
    final byline = [
      if (r.authors.isNotEmpty) r.authors.length > 2 ? '${r.authors.first} et al.' : r.authors.join(', '),
      if (r.year != null) '${r.year}',
    ].join(' · ');
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 4),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Icon(r.isBook ? Icons.menu_book : Icons.article, size: 20),
            const SizedBox(width: 8),
            Expanded(child: Text(r.title, style: text.titleSmall)),
          ]),
          if (byline.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 4), child: Text(byline, style: text.bodySmall)),
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              ['Open access via ${r.source}', if (r.license != null) r.license!, if (r.doi != null) 'doi:${r.doi}'].join(' · '),
              style: text.labelSmall,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(spacing: 8, runSpacing: 4, children: [
            if (r.pdfUrl != null)
              FilledButton.icon(
                onPressed: () => _open(context, r.pdfUrl!),
                icon: const Icon(Icons.picture_as_pdf, size: 18),
                label: const Text('Open PDF'),
              ),
            if (r.epubUrl != null)
              OutlinedButton.icon(
                onPressed: () => _open(context, r.epubUrl!),
                icon: const Icon(Icons.book, size: 18),
                label: const Text('EPUB'),
              ),
            if (r.landingUrl != null)
              OutlinedButton.icon(
                onPressed: () => _open(context, r.landingUrl!),
                icon: const Icon(Icons.open_in_new, size: 18),
                label: Text(r.pdfUrl == null ? 'Read online' : 'Source page'),
              ),
          ]),
        ]),
      ),
    );
  }
}
