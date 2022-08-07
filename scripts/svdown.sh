wpctl set-volume $(wpctl status | grep spotify | tail -1 | sed 's/[^0-9]*//g') 5%-
