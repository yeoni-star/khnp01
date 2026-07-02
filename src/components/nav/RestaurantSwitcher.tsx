import { switchRestaurant } from "@/actions/auth-actions";
import { RESTAURANTS, RESTAURANT_LABELS, type RestaurantCode } from "@/lib/restaurants";

export default function RestaurantSwitcher({ current }: { current: RestaurantCode }) {
  return (
    <div className="flex overflow-hidden rounded-full border border-gray-200">
      {RESTAURANTS.map((code) => {
        const active = code === current;
        return (
          <form key={code} action={switchRestaurant.bind(null, code)}>
            <button
              type="submit"
              disabled={active}
              className={`px-3 py-1 text-sm font-medium ${
                active ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {RESTAURANT_LABELS[code]}
            </button>
          </form>
        );
      })}
    </div>
  );
}
