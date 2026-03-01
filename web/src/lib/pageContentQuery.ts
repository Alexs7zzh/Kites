import {imageProjection} from './siteContentImagePreparation'

export const PAGE_CONTENT_QUERY = `{
  "sitePage": *[_id == "sitePage"][0]{
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
          _type == "pageImageBlock" => {
            layout,
            align,
            "image": image{
              ${imageProjection}
            }
          },
          _type == "pageImagePairBlock" => {
            ratio,
            "leftImage": leftImage{
              ${imageProjection}
            },
            "rightImage": rightImage{
              ${imageProjection}
            }
          },
          _type == "contactFormBlock" => {
            heading,
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
            },
            formAction
          }
        }, [])
      }
    }, [])
  },
  "legacySiteContent": *[_id == "siteContent"][0]{
    "about": about{
      "main_image": main_image{
        ${imageProjection}
      },
      text_1,
      "notation_image": notation_image{
        ${imageProjection}
      },
      text_2
    },
    "scent": scent{
      "main_image": main_image{
        ${imageProjection}
      },
      title,
      description,
      details,
      "comparison_images": coalesce(comparison_images[]{
        ${imageProjection}
      }, [])
    },
    "process": process{
      text_1,
      text_2,
      text_3,
      "gallery_images": coalesce(gallery_images[]{
        ${imageProjection}
      }, [])
    },
    "studio": studio{
      "header_images": coalesce(header_images[]{
        ${imageProjection}
      }, []),
      intro_text,
      "projects": coalesce(projects[]{
        title,
        materials,
        location,
        description,
        "main_image": main_image{
          ${imageProjection}
        },
        "secondary_image": secondary_image{
          ${imageProjection}
        },
        "extra_image": extra_image{
          ${imageProjection}
        },
        "gallery": coalesce(gallery[]{
          ${imageProjection}
        }, []),
        "gallery_vertical": coalesce(gallery_vertical[]{
          ${imageProjection}
        }, [])
      }, [])
    },
    "contact": contact{
      bio_text,
      "bio_image": bio_image{
        ${imageProjection}
      },
      form_action
    }
  },
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
    }
  }
}`
