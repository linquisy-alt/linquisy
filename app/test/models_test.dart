import 'package:flutter_test/flutter_test.dart';
import 'package:linkquisy/models/models.dart';

void main() {
  test('PaperResult reads what the Librarian bot writes', () {
    final r = PaperResult.fromMap({
      'title': 'Attention Is All You Need',
      'authors': ['Ashish Vaswani', 'Noam Shazeer'],
      'year': 2017,
      'doi': '10.48550/arxiv.1706.03762',
      'pdfUrl': 'https://arxiv.org/pdf/1706.03762',
      'landingUrl': 'https://arxiv.org/abs/1706.03762',
      'source': 'arXiv',
      'kind': 'article',
    });
    expect(r.year, 2017);
    expect(r.isBook, isFalse);
    expect(r.pdfUrl, 'https://arxiv.org/pdf/1706.03762');
  });

  test('unknown bot modes fall back to auto', () {
    expect(botModeFrom('command'), BotMode.command);
    expect(botModeFrom(null), BotMode.auto);
    expect(botModeFrom('weird'), BotMode.auto);
  });
}
