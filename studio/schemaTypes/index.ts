import {siteContentSchemaTypes} from './siteContent'
import {siteSettingsSchemaTypes} from './siteSettings'
import {sitePageSchemaTypes} from './sitePage'

export const schemaTypes = [
  ...siteContentSchemaTypes,
  ...siteSettingsSchemaTypes,
  ...sitePageSchemaTypes,
]
