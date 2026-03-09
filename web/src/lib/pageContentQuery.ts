import {imageProjection} from './imagePreparation'

export const PAGE_CONTENT_QUERY = `{
  "siteSettings": *[_id == "siteSettings"][0]{
    siteName,
    defaultDescription,
    canonicalDomain,
    "defaultOgImage": defaultOgImage{
      alt,
      "url": asset->url,
      "metadata": asset->metadata{
        dimensions{
          width,
          height
        }
      }
    },
    social{
      xHandle,
      instagramHandle
    },
    "contact": contact{
      bioText,
      formTitle,
      formAction,
      "bioImage": bioImage{
        ${imageProjection}
      }
    },
    "sections": coalesce(sections[]{
      _key,
      "section": @->{
        _id,
        navLabel,
        title,
        "content": coalesce(content[]{
          _key,
          _type,
          _type == "block" => {
            ...,
            markDefs[]{
              ...,
              _type == "link" => {
                _key,
                _type,
                href
              }
            }
          },
          _type == "pagePortableTextBlock" => {
            body[]{
              ...,
              markDefs[]{
                ...,
                _type == "link" => {
                  _key,
                  _type,
                  href
                }
              }
            }
          },
          _type == "pageSpacerBlock" => {
            level
          },
          _type == "pageFullImageGroupBlock" => {
            "images": coalesce(images[]{
              ${imageProjection}
            }, [])
          },
          _type == "pageHalfImageGroupBlock" => {
            captionTitle,
            captionDescription,
            "images": coalesce(images[]{
              ${imageProjection}
            }, [])
          }
        }, [])
      }
    }, [])
  }
}`
