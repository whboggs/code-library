# README

## All Variables Used
| Custom Variable Name | Meta Parameter | GA4 Parameter | Value Type | Description |
|---|---|---|---|---|
| `cJS - Ad Placement` | `ad_placement` | — | String | Custom JavaScript variable that returns the ad placement for the session. |
| `cJS - Traffic Source` | `traffic_source` | — | String | Custom JavaScript variable that returns the traffic source for the session. |
| `DLV - currency` | `currency` | `currency` | String | The currency for the `value` specified. |
| `DLV - item_category` | `content_category` | `items[].item_category` | String | Category of the page/product. Optional. |
| `DLV - item_id` | `content_ids` | `items[].item_id` | Array of integers or strings | Product IDs associated with the event, such as SKUs. |
| `DLV - item_name` | `content_name` | `items[].item_name` | String | Name of the page/product. Optional. |
| `DLV - item_type` | `content_type` | — (no GA4 equivalent) | String | Either `product` or `product_group` based on the IDs passed in `content_ids` or `contents`. |
| `DLV - items` | `contents` | `items[]` array | Array of objects | Array of JSON objects with product IDs and quantities. `id` and `quantity` required. |
| `DLV - num_items` | `num_items` | — (sum of `items[].quantity`) | Integer | Used with `InitiateCheckout`. Number of items when checkout was initiated. |
| `DLV - predicted_ltv` | `predicted_ltv` | — (GA4 computes pLTV internally) | Integer, float | Predicted lifetime value of a subscriber as defined by the advertiser. |
| `DLV - search_string` | `search_string` | `search_term` | String | Used with the `Search` event. The string entered by the user. |
| `DLV - status` | `status` | — | Boolean | Used with `CompleteRegistration` to show registration status. Optional. |
| `DLV - value` | `value` | `value` | Integer or float | The value of a user performing this event to the business. |
| — | `delivery_category` | `shipping_tier` | String | Type of delivery for a purchased product: `in_store`, `curbside`, or `home_delivery`. |
| — | — (no Meta equivalent) | `transaction_id` | String | Unique ID for the transaction. Required for GA4 `purchase` and `refund` events. |
