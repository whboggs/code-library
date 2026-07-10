# README

## All Variables Used
| Custom Variable Name | Meta Parameter | Value Type | Description | GA4 Parameter |
|---|---|---|---|---|
| `cJS - Ad Placement` | `ad_placement` | String | Custom JavaScript variable that returns the ad placement for the session. | — |
| `cJS - Traffic Source` | `traffic_source` | String | Custom JavaScript variable that returns the traffic source for the session. | — |
| `DLV - currency` | `currency` | String | The currency for the `value` specified. | `currency` |
| `DLV - item_category` | `content_category` | String | Category of the page/product. Optional. | `items[].item_category` |
| `DLV - item_ids` | `content_ids` | Array of integers or strings | Product IDs associated with the event, such as SKUs. | `items[].item_id` |
| `DLV - item_name` | `content_name` | String | Name of the page/product. Optional. | `items[].item_name` |
| `DLV - item_type` | `content_type` | String | Either `product` or `product_group` based on the IDs passed in `content_ids` or `contents`. | — (no GA4 equivalent) |
| `DLV - items` | `contents` | Array of objects | Array of JSON objects with product IDs and quantities. `id` and `quantity` required. | `items[]` array |
| `DLV - num_items` | `num_items` | Integer | Used with `InitiateCheckout`. Number of items when checkout was initiated. | — (sum of `items[].quantity`) |
| `DLV - predicted_ltv` | `predicted_ltv` | Integer, float | Predicted lifetime value of a subscriber as defined by the advertiser. | — (GA4 computes pLTV internally) |
| `DLV - search_string` | `search_string` | String | Used with the `Search` event. The string entered by the user. | `search_term` |
| `DLV - status` | `status` | Boolean | Used with `CompleteRegistration` to show registration status. Optional. | — |
| `DLV - value` | `value` | Integer or float | The value of a user performing this event to the business. | `value` |
