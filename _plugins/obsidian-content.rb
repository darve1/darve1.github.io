# frozen_string_literal: true
#
# Obsidian에서 쓴 마크다운을 블로그에 맞게 고친다.
# 대부분은 마크다운이 HTML로 바뀐 직후(레이아웃을 입히기 전)에 고치고,
# 이미지 크기 문법만 변환 전에 고친다. (kramdown은 '|'가 있는 줄을 표로 읽는다)
#
#   ![](assets/posts/글/clip.mp4)          → 동영상 플레이어 (mp4·webm·mov·m4v·ogv)
#   ![](assets/posts/글/sound.mp3)         → 오디오 플레이어 (mp3·wav·ogg·m4a·flac 등)
#   ![](assets/posts/글/slide.pdf)         → PDF 뷰어 + 파일 링크
#   ![](assets/posts/글/code.zip)          → 다운로드 링크 (그 밖의 파일)
#   ![](https://youtu.be/ID)               → YouTube 플레이어 (?t= 시작 시간 지원)
#   ![설명|300](assets/posts/글/a.png)     → 너비 300px 이미지
#   [글](_posts/2026-01-01-slug.md#제목)   → /posts/slug/#제목 (발행 전 글이면 링크 없이 글자만)
#   [제목](#제목)                          → 같은 글의 제목으로 이동
#   [파일](assets/posts/글/a.zip)          → /assets/posts/글/a.zip
#   > [!tip] 제목                          → Chirpy 강조 박스 (prompt-tip)

require "cgi/escape"

module ObsidianContent
  IMAGE = %w[png jpg jpeg gif webp svg avif bmp ico].freeze
  VIDEO = %w[mp4 webm mov m4v ogv].freeze
  AUDIO = %w[mp3 wav ogg oga m4a flac aac opus].freeze

  # Obsidian 콜아웃 종류 → Chirpy 강조 박스 (목록에 없으면 info)
  PROMPTS = {
    "tip" => %w[tip hint success check done important],
    "warning" => %w[warning caution attention question help faq],
    "danger" => %w[danger error failure fail missing bug]
  }.freeze

  YOUTUBE = %r{\Ahttps?://(?:www\.|m\.)?(?:youtube\.com/(?:watch\?(?:[^#]*&)?v=|shorts/|embed/|live/)|youtu\.be/)([\w-]{11})}

  # ![설명|300](주소), ![설명|300x200](주소) — 표 안에서 쓰는 \| 는 제외 (변환 후 sized 가 처리)
  SIZED_IMAGE = /!\[([^\]|]*?)(?<!\\)\|(\d+)(?:x(\d+))?\]\(([^()\s]+)\)/

  class << self
    # 사이트에 출력되는 글·페이지의 소스 경로 → 주소 ("_posts/2026-01-01-slug.md" => "/posts/slug/")
    attr_accessor :urls

    def markdown?(doc)
      ext = doc.respond_to?(:extname) ? doc.extname : doc.ext
      %w[.md .markdown].include?(ext.to_s.downcase)
    end

    # 변환 전: 코드 블록 밖의 ![설명|300](주소) → ![설명](주소){: width="300" }
    def prepare(markdown)
      fence = nil
      markdown.lines.map do |line|
        if (m = line.match(/\A {0,3}(`{3,}|~{3,})/))
          if fence.nil?
            fence = m[1][0]
            next line
          elsif m[1][0] == fence
            fence = nil
            next line
          end
        end
        next line if fence

        line.gsub(SIZED_IMAGE) do
          alt, width, height, url = Regexp.last_match.captures
          %(![#{alt}](#{url}){: width="#{width}"#{%( height="#{height}") if height} })
        end
      end.join
    end

    def convert(html, baseurl)
      html = callouts(html)
      html = html.gsub(/<img\b[^>]*>/) { |tag| embed(tag, baseurl) }
      html.gsub(%r{<a\b([^>]*)>(.*?)</a>}m) do
        link(Regexp.last_match(0), Regexp.last_match(1), Regexp.last_match(2), html, baseurl)
      end
    end

    private

    def callouts(html)
      html.gsub(%r{<blockquote>(\s*)<p>\[!([\w-]+)\][+-]?[ \t]*(.*?)(\n|</p>)}m) do
        space, type, title, ending = Regexp.last_match.captures
        kind = PROMPTS.find { |_, types| types.include?(type.downcase) }&.first || "info"
        head = title.empty? ? "" : %(<p class="callout-title"><strong>#{title}</strong></p>)
        %(<blockquote class="prompt-#{kind}">#{space}#{head}#{ending == "\n" ? "<p>" : ""})
      end
    end

    def embed(tag, baseurl)
      src = tag[/\ssrc="([^"]*)"/, 1] or return tag
      src = CGI.unescapeHTML(src)
      alt = tag[/\salt="([^"]*)"/, 1].to_s
      caption = alt.empty? ? "" : "<em>#{alt}</em>"
      return youtube(Regexp.last_match(1), src) + caption if src =~ YOUTUBE

      path = src.split(/[?#]/, 2).first
      ext = File.extname(path).delete_prefix(".").downcase
      url = CGI.escapeHTML(local?(src) ? "#{baseurl}/#{src}" : src)
      name = alt.empty? ? CGI.escapeHTML(File.basename(decode(path))) : alt

      case ext
      when *VIDEO
        %(<video class="embed-video file" src="#{url}" controls preload="metadata">) +
          %(<a href="#{url}">#{name}</a></video>#{caption})
      when *AUDIO
        %(<audio class="embed-audio file" src="#{url}" controls preload="metadata">) +
          %(<a href="#{url}">#{name}</a></audio>#{caption})
      when "pdf"
        %(<iframe class="embed-pdf" src="#{url}" title="#{name}" loading="lazy"></iframe>) +
          %(<a class="file-link" href="#{url}"><i class="fas fa-file-pdf"></i>#{name}</a>)
      else
        if local?(src) && !IMAGE.include?(ext)
          %(<a class="file-link" href="#{url}" download><i class="fas fa-file-arrow-down"></i>#{name}</a>)
        else
          sized(tag, alt)
        end
      end
    end

    # 표 안의 크기 문법: | ![설명\|300](...) | → alt="설명|300"
    def sized(tag, alt)
      m = alt.match(/\A(.*?)\s*\|\s*(\d+)(?:x(\d+))?\z/) or return tag
      size = %( width="#{m[2]}") + (m[3] ? %( height="#{m[3]}") : "")
      tag.sub(%(alt="#{alt}"), %(alt="#{m[1]}"#{size}))
    end

    def youtube(id, src)
      start = src[/[?&#](?:t|start)=(\d+(?:[hms]\d*)*[hms]?)/, 1]
      seconds = if start.nil? then 0
                elsif start.match?(/\A\d+\z/) then start.to_i
                else start.scan(/(\d+)([hms])/).sum { |n, unit| n.to_i * { "h" => 3600, "m" => 60, "s" => 1 }[unit] }
                end
      query = seconds.positive? ? "?start=#{seconds}" : ""
      %(<iframe class="embed-video" loading="lazy" src="https://www.youtube.com/embed/#{id}#{query}" ) +
        %(title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; ) +
        %(encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>)
    end

    def link(tag, attrs, text, html, baseurl)
      href = attrs[/\shref="([^"]*)"/, 1] or return tag
      href = CGI.unescapeHTML(href)

      if href.start_with?("#")
        id = anchor(href[1..], html)
        return id ? with_href(tag, "##{id}") : tag
      end
      return tag unless local?(href)

      path, fragment = href.split("#", 2)
      if path.match?(/\.(md|markdown)\z/i)
        url = urls[decode(path)]
        return %(<span class="draft-link" title="발행 전이거나 없는 글">#{text}</span>) unless url

        url += "##{heading_id(decode(fragment))}" unless fragment.to_s.empty?
        return with_href(tag, baseurl + url)
      end

      tag = with_href(tag, "#{baseurl}/#{href}")
      return tag unless path.start_with?("assets/") && !attrs.include?("class=")

      tag.sub(/\A<a\b/, '<a class="file-link"').sub(/>/, '><i class="fas fa-paperclip"></i>')
    end

    def with_href(tag, href)
      tag.sub(/\shref="[^"]*"/, %( href="#{CGI.escapeHTML(href)}"))
    end

    # 같은 글 안의 제목 링크: 그대로 있는 id 또는 kramdown(GFM)이 만든 제목 id
    def anchor(fragment, html)
      fragment = decode(fragment)
      [fragment, heading_id(fragment)].find { |id| html.include?(%( id="#{CGI.escapeHTML(id)}")) }
    end

    # kramdown-parser-gfm의 generate_gfm_header_id와 같은 규칙
    def heading_id(text)
      text.downcase.gsub(/[^\p{Word}\- \t]/, "").tr(" \t", "-")
    end

    # 볼트 기준 경로(assets/…, _posts/…)인지. 주소(https:, mailto:), /…, #…, ./…는 제외
    def local?(url)
      !url.match?(%r{\A(?:[a-z][\w+.-]*:|/|#|\.)}i)
    end

    def decode(str)
      str.b.gsub(/%(\h\h)/n) { Regexp.last_match(1).hex.chr }.force_encoding(Encoding::UTF_8).scrub
    end
  end
end

Jekyll::Hooks.register :site, :pre_render do |site|
  docs = site.collections.values.flat_map(&:docs) + site.pages
  ObsidianContent.urls = docs.select(&:write?).to_h { |doc| [doc.relative_path, doc.url] }
end

Jekyll::Hooks.register [:documents, :pages], :pre_render do |doc|
  doc.content = ObsidianContent.prepare(doc.content) if ObsidianContent.markdown?(doc)
end

Jekyll::Hooks.register [:documents, :pages], :post_convert do |doc|
  next unless ObsidianContent.markdown?(doc)

  doc.content = ObsidianContent.convert(doc.content, doc.site.baseurl.to_s.chomp("/"))
end
